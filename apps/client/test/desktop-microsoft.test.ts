import { describe, expect, it } from "vitest";
import type { DeepLinks } from "../src/auth/deep-links";
import { DesktopMicrosoftAuthorizer } from "../src/microsoft/desktop-microsoft-authorizer";

interface Post {
	readonly url: string;
	readonly form: Record<string, string>;
}

function setup(options: { returns?: (url: URL) => string | null; status?: number } = {}) {
	const opened: URL[] = [];
	const waited: string[] = [];
	const posts: Post[] = [];
	let arrive: (url: string | null) => void = () => undefined;
	const returns =
		options.returns ??
		((url: URL) =>
			`anothertodo://auth/microsoft?code=code-1&state=${url.searchParams.get("state")}`);
	const links: DeepLinks = {
		open: async (url) => {
			opened.push(new URL(url));
			arrive(returns(new URL(url)));
		},
		waitFor: (prefix) => {
			waited.push(prefix);
			return new Promise((resolve) => {
				arrive = resolve;
			});
		},
	};
	const authorizer = new DesktopMicrosoftAuthorizer(
		{ clientId: "ms-client", scheme: "anothertodo" },
		{ now: () => new Date(1_000) },
		{
			links,
			random: { bytes: (length) => new Uint8Array(length).fill(1) },
			fetcher: async (url, init) => {
				const form = Object.fromEntries(new URLSearchParams(String(init.body)));
				posts.push({ url, form });
				return new Response(
					JSON.stringify(
						form.grant_type === "refresh_token"
							? { access_token: "a2" }
							: { access_token: "a1", refresh_token: "r1", expires_in: 100 },
					),
					{ status: options.status ?? 200 },
				);
			},
		},
	);
	return { authorizer, opened, waited, posts };
}

describe("DesktopMicrosoftAuthorizer", () => {
	it("asks Microsoft for the To Do permission and exchanges the returned code", async () => {
		const { authorizer, opened, waited, posts } = setup();
		const tokens = await authorizer.authorize();
		expect(authorizer.available).toBe(true);
		const request = opened[0]!;
		expect(`${request.origin}${request.pathname}`).toBe(
			"https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize",
		);
		expect(Object.fromEntries(request.searchParams)).toMatchObject({
			client_id: "ms-client",
			response_type: "code",
			redirect_uri: "anothertodo://auth/microsoft",
			scope: "openid offline_access Tasks.ReadWrite",
			prompt: "select_account",
			code_challenge_method: "S256",
		});
		expect(waited).toEqual(["anothertodo://auth/microsoft"]);
		expect(posts[0]!.url).toBe("https://login.microsoftonline.com/consumers/oauth2/v2.0/token");
		expect(posts[0]!.form).toMatchObject({
			client_id: "ms-client",
			grant_type: "authorization_code",
			code: "code-1",
			redirect_uri: "anothertodo://auth/microsoft",
		});
		expect(posts[0]!.form.code_verifier).toBeTruthy();
		expect(tokens).toEqual({ accessToken: "a1", refreshToken: "r1", expiresAt: 101_000 });
	});

	it("gives up when the browser never returns or returns someone else's state", async () => {
		const silent = setup({ returns: () => null });
		expect(await silent.authorizer.authorize()).toBeNull();
		const forged = setup({ returns: () => "anothertodo://auth/microsoft?code=c&state=other" });
		expect(await forged.authorizer.authorize()).toBeNull();
		expect(forged.posts).toEqual([]);
	});

	it("refreshes with the same permission and sensible defaults", async () => {
		const { authorizer, posts } = setup();
		expect(await authorizer.refresh("r1")).toEqual({
			accessToken: "a2",
			refreshToken: null,
			expiresAt: 1_000 + 3_600_000,
		});
		expect(posts[0]!.form).toEqual({
			client_id: "ms-client",
			grant_type: "refresh_token",
			refresh_token: "r1",
			scope: "openid offline_access Tasks.ReadWrite",
		});
	});

	it("fails when Microsoft refuses the request", async () => {
		const { authorizer } = setup({ status: 400 });
		await expect(authorizer.refresh("r1")).rejects.toThrow("400");
		await expect(authorizer.authorize()).rejects.toThrow("400");
	});
});
