import { afterEach, describe, expect, it, vi } from "vitest";
import { bearer, startLocalApp } from "./support/local-app";

const ENV = { AZURE_CLIENT_ID: "client-id", AZURE_CLIENT_SECRET: "secret" };
const REAL_FETCH = globalThis.fetch;

function idToken(claims: Record<string, unknown>): string {
	return `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
}

interface MicrosoftReply {
	status?: number;
	body?: unknown;
	throws?: boolean;
}

function fakeMicrosoft(reply: MicrosoftReply) {
	const calls: { url: string; body: string }[] = [];
	vi.stubGlobal("fetch", (input: string, init?: RequestInit) => {
		if (!String(input).startsWith("https://login.microsoftonline.com/")) {
			return REAL_FETCH(input, init);
		}
		calls.push({ url: String(input), body: String(init?.body) });
		if (reply.throws) {
			return Promise.reject(new Error("offline"));
		}
		return Promise.resolve(
			new Response(JSON.stringify(reply.body ?? {}), { status: reply.status ?? 200 }),
		);
	});
	return calls;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

const CALLBACK = "http://localhost:3000/auth/callback";

async function begin(base: string, redirect = CALLBACK) {
	const reply = await REAL_FETCH(
		`${base}/auth/microsoft/start?redirect_uri=${encodeURIComponent(redirect)}`,
		{ redirect: "manual" },
	);
	return { reply, location: reply.headers.get("location") };
}

async function finish(base: string, state: string, query = "code=abc") {
	return REAL_FETCH(`${base}/auth/microsoft/callback?${query}&state=${encodeURIComponent(state)}`, {
		redirect: "manual",
	});
}

async function signIn(base: string, redirect?: string, query?: string) {
	const { location } = await begin(base, redirect);
	const state = new URL(location!).searchParams.get("state")!;
	return finish(base, state, query);
}

describe("Microsoft sign-in", () => {
	it("is offered only when both the client id and secret are set", async () => {
		const on = await startLocalApp(ENV);
		expect(
			((await (await fetch(`${on.base}/config`)).json()) as { providers: string[] }).providers,
		).toEqual(["Microsoft"]);
		const half = await startLocalApp({ AZURE_CLIENT_ID: "client-id" });
		expect(
			((await (await fetch(`${half.base}/config`)).json()) as { providers: string[] }).providers,
		).toEqual([]);
		expect((await fetch(`${half.base}/auth/microsoft/start`)).status).toBe(404);
	});

	it("sends the browser to Microsoft with a signed state", async () => {
		const app = await startLocalApp({ ...ENV, AZURE_TENANT_ID: "consumers" });
		const { reply, location } = await begin(app.base);
		expect(reply.status).toBe(302);
		const url = new URL(location!);
		expect(url.origin + url.pathname).toBe(
			"https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",
		);
		expect(url.searchParams.get("client_id")).toBe("client-id");
		expect(url.searchParams.get("redirect_uri")).toBe(
			"http://localhost:3000/auth/microsoft/callback",
		);
		expect(url.searchParams.get("scope")).toBe("openid email profile");
		expect(url.searchParams.get("state")).toBeTruthy();
	});

	it("only returns to the app's own pages", async () => {
		const app = await startLocalApp({ ...ENV, CORS_ORIGINS: "https://todo.example.com" });
		expect((await begin(app.base, "https://evil.example.com/auth/callback")).reply.status).toBe(
			400,
		);
		expect((await begin(app.base, "http://localhost:3000/elsewhere")).reply.status).toBe(400);
		expect((await begin(app.base, "")).reply.status).toBe(400);
		expect((await REAL_FETCH(`${app.base}/auth/microsoft/start`)).status).toBe(400);
		expect((await begin(app.base, "https://todo.example.com/auth/callback")).reply.status).toBe(
			302,
		);
		expect((await begin(app.base, "anothertodo://auth/callback")).reply.status).toBe(302);
		expect((await begin(app.base, "http://localhost:3000/auth/callback")).reply.status).toBe(302);
	});

	it("signs the person in, creating their account once, and hands the token back in the fragment", async () => {
		const calls = fakeMicrosoft({
			body: { id_token: idToken({ aud: "client-id", oid: "abc-123", email: "sam@example.com" }) },
		});
		const app = await startLocalApp(ENV);
		const redirect = CALLBACK;
		const first = await signIn(app.base, redirect);
		expect(first.status).toBe(302);
		const location = first.headers.get("location")!;
		expect(location.startsWith(`${redirect}#access_token=`)).toBe(true);
		const token = new URLSearchParams(location.split("#")[1]).get("access_token")!;
		const tasks = await REAL_FETCH(`${app.base}/tasks`, { headers: bearer(token) });
		expect(tasks.status).toBe(200);
		expect(calls[0]!.body).toContain("code=abc");
		expect(calls[0]!.body).toContain("client_secret=secret");
		expect(calls[0]!.url).toBe("https://login.microsoftonline.com/common/oauth2/v2.0/token");
		await signIn(app.base, redirect);
		expect(await app.platform.identity.directory.findByEmail("sam@example.com")).toEqual({
			sub: "microsoft:abc-123",
			email: "sam@example.com",
		});
	});

	it("falls back to the subject and the preferred username", async () => {
		fakeMicrosoft({
			body: {
				id_token: idToken({ aud: "client-id", sub: "s-1", preferred_username: "lee@example.com" }),
			},
		});
		const app = await startLocalApp(ENV);
		expect((await signIn(app.base)).status).toBe(302);
		expect(await app.platform.identity.directory.findByEmail("lee@example.com")).toEqual({
			sub: "microsoft:s-1",
			email: "lee@example.com",
		});
		fakeMicrosoft({ body: { id_token: idToken({ aud: "client-id", sub: "s-2" }) } });
		expect((await signIn(app.base)).headers.get("location")).toContain("#access_token=");
	});

	it("reports a failed sign-in to the app instead of signing anyone in", async () => {
		const app = await startLocalApp(ENV);
		const failure = async (reply: MicrosoftReply, query?: string) => {
			fakeMicrosoft(reply);
			return (await signIn(app.base, undefined, query)).headers.get("location");
		};
		const expected = `${CALLBACK}#error=sign_in_failed`;
		expect(await failure({}, "error=access_denied")).toBe(expected);
		expect(await failure({ status: 400, body: { error: "invalid_grant" } })).toBe(expected);
		expect(await failure({ body: { id_token: idToken({ aud: "other", oid: "x" }) } })).toBe(
			expected,
		);
		expect(await failure({ body: { id_token: idToken({ aud: "client-id" }) } })).toBe(expected);
		expect(await failure({ body: {} })).toBe(expected);
		expect(await failure({ throws: true })).toBe(expected);
		expect(
			await failure({ status: 500, body: { id_token: idToken({ aud: "client-id", oid: "x" }) } }),
		).toBe(expected);
	});

	it("rejects a callback whose state is forged or missing", async () => {
		const app = await startLocalApp(ENV);
		expect((await finish(app.base, "forged")).status).toBe(400);
		expect((await REAL_FETCH(`${app.base}/auth/microsoft/callback?code=abc`)).status).toBe(400);
	});
});
