import { describe, expect, it, vi } from "vitest";
import type { BrowserSession } from "../src/auth/browser-session";
import { AuthenticationService } from "../src/auth/authentication-service";
import { NoAuthorizationServer } from "../src/auth/no-authorization-server";
import {
	InvalidCredentialsError,
	PasswordAuthorizationServer,
} from "../src/auth/password-authorization-server";
import { TokenRepository } from "../src/auth/token-repository";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { FakeAuthorizationServer, FixedClock } from "./support/fakes";

class FakeBrowser implements BrowserSession {
	readonly redirectUri = "anothertodo://auth/callback";
	readonly opened: string[] = [];
	result: string | null = null;

	async authorize(url: string): Promise<string | null> {
		this.opened.push(url);
		return this.result;
	}
}

describe("NoAuthorizationServer", () => {
	it("hands out a token that never expires", async () => {
		const server = new NoAuthorizationServer();
		const tokens = await server.authorize();
		expect(tokens).toEqual({
			accessToken: "",
			refreshToken: null,
			expiresAt: Number.MAX_SAFE_INTEGER,
		});
		expect(await server.refresh()).toEqual(tokens);
		await expect(server.revoke()).resolves.toBeUndefined();
	});
});

describe("PasswordAuthorizationServer", () => {
	const credentials = { username: "admin", password: "secret" };

	function server(respond: () => Response | Promise<Response>) {
		const calls: { url: string; init?: RequestInit }[] = [];
		return {
			calls,
			server: new PasswordAuthorizationServer({
				apiUrl: "https://todo.example.com",
				now: () => 1_000,
				browser: new FakeBrowser(),
				fetcher: async (url, init) => {
					calls.push({ url, init });
					return respond();
				},
			}),
		};
	}

	it("exchanges a username and password for a token that lasts as long as the server says", async () => {
		const { server: password, calls } = server(
			() => new Response(JSON.stringify({ accessToken: "t", expiresIn: 60 }), { status: 200 }),
		);
		expect(await password.authorize(undefined, credentials)).toEqual({
			accessToken: "t",
			refreshToken: null,
			expiresAt: 61_000,
		});
		expect(calls[0]!.url).toBe("https://todo.example.com/auth/login");
		expect(calls[0]!.init?.body).toBe(JSON.stringify(credentials));
	});

	it("does nothing without credentials and refuses wrong ones", async () => {
		const { server: password, calls } = server(() => new Response("{}", { status: 401 }));
		expect(await password.authorize()).toBeNull();
		expect(calls).toHaveLength(0);
		await expect(password.authorize(undefined, credentials)).rejects.toBeInstanceOf(
			InvalidCredentialsError,
		);
	});

	it("cannot refresh a session, only start a new one", async () => {
		const { server: password } = server(() => new Response("{}"));
		await expect(password.refresh()).rejects.toBeInstanceOf(InvalidCredentialsError);
		await expect(password.revoke()).resolves.toBeUndefined();
	});

	it("uses fetch by default", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response(JSON.stringify({ accessToken: "t", expiresIn: 1 }))),
		);
		const password = new PasswordAuthorizationServer({
			apiUrl: "https://x",
			now: () => 0,
			browser: new FakeBrowser(),
		});
		expect((await password.authorize(undefined, credentials))?.accessToken).toBe("t");
		vi.unstubAllGlobals();
	});
});

describe("PasswordAuthorizationServer with Microsoft", () => {
	function setup(result: string | null) {
		const browser = new FakeBrowser();
		browser.result = result;
		return {
			browser,
			server: new PasswordAuthorizationServer({
				apiUrl: "https://todo.example.com",
				now: () => 1_000,
				browser,
			}),
		};
	}

	it("signs in through the server's Microsoft page and reads the token it returns", async () => {
		const { server, browser } = setup(
			"anothertodo://auth/callback#access_token=abc%2E1&expires_in=60",
		);
		expect(await server.authorize("Microsoft")).toEqual({
			accessToken: "abc.1",
			refreshToken: null,
			expiresAt: 61_000,
		});
		expect(browser.opened).toEqual([
			"https://todo.example.com/auth/microsoft/start?redirect_uri=anothertodo%3A%2F%2Fauth%2Fcallback",
		]);
	});

	it("does nothing when the person closes the browser and fails when sign-in fails", async () => {
		expect(await setup(null).server.authorize("Microsoft")).toBeNull();
		await expect(
			setup("anothertodo://auth/callback#error=sign_in_failed").server.authorize("Microsoft"),
		).rejects.toBeInstanceOf(InvalidCredentialsError);
	});
});

describe("browser sessions", () => {
	it("opens the sign-in page through expo-web-browser and returns where it ended up", async () => {
		const browser = await import("expo-web-browser");
		const spy = vi.spyOn(browser, "openAuthSessionAsync");
		const { ExpoBrowserSession } = await import("../src/auth/expo-browser-session");
		const session = new ExpoBrowserSession("anothertodo");
		expect(session.redirectUri).toBe("anothertodo://auth/callback");
		spy.mockResolvedValueOnce({ type: "success", url: "anothertodo://auth/callback#x=1" });
		expect(await session.authorize("https://todo.example.com/start")).toBe(
			"anothertodo://auth/callback#x=1",
		);
		expect(await session.authorize("https://todo.example.com/start")).toBeNull();
		expect(spy).toHaveBeenCalledWith(
			"https://todo.example.com/start",
			"anothertodo://auth/callback",
		);
	});

	it("opens the system browser and waits for the deep link on desktop", async () => {
		const { DeepLinkBrowserSession } = await import("../src/auth/deep-link-browser-session");
		const opened: string[] = [];
		const waited: [string, number][] = [];
		const session = new DeepLinkBrowserSession(
			"anothertodo",
			{
				open: async (url) => {
					opened.push(url);
				},
				waitFor: async (prefix, timeout) => {
					waited.push([prefix, timeout]);
					return "anothertodo://auth/callback#access_token=a";
				},
			},
			1_000,
		);
		expect(session.redirectUri).toBe("anothertodo://auth/callback");
		expect(await session.authorize("https://x/start")).toBe(
			"anothertodo://auth/callback#access_token=a",
		);
		expect(opened).toEqual(["https://x/start"]);
		expect(waited).toEqual([["anothertodo://auth/callback", 1_000]]);
		expect(new DeepLinkBrowserSession("anothertodo").redirectUri).toBe(
			"anothertodo://auth/callback",
		);
	});
});

describe("AuthenticationService password sign-in", () => {
	it("stays signed out when the server declines to sign in", async () => {
		const server = new FakeAuthorizationServer();
		server.authorizeResult = null;
		const service = new AuthenticationService(
			server,
			new TokenRepository(new MemoryKeyValueStore()),
			new FixedClock(),
		);
		await service.signInWithPassword({ username: "a", password: "b" });
		expect(service.get()).toBe("loading");
	});
});
