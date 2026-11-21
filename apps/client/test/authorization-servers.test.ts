import { describe, expect, it, vi } from "vitest";
import { AuthenticationService } from "../src/auth/authentication-service";
import { NoAuthorizationServer } from "../src/auth/no-authorization-server";
import {
	InvalidCredentialsError,
	PasswordAuthorizationServer,
} from "../src/auth/password-authorization-server";
import { TokenRepository } from "../src/auth/token-repository";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { FakeAuthorizationServer, FixedClock } from "./support/fakes";

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
		const password = new PasswordAuthorizationServer({ apiUrl: "https://x", now: () => 0 });
		expect((await password.authorize(undefined, credentials))?.accessToken).toBe("t");
		vi.unstubAllGlobals();
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
