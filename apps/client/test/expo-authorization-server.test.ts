import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => {
	const state = {
		promptResult: { type: "success", params: { code: "code-1" } } as {
			type: string;
			params?: { code: string };
		},
		requests: [] as Record<string, unknown>[],
	};
	class AuthRequest {
		codeVerifier = "verifier-1";
		constructor(config: Record<string, unknown>) {
			state.requests.push(config);
		}
		async promptAsync() {
			return state.promptResult;
		}
	}
	return {
		state,
		AuthRequest,
		ResponseType: { Code: "code" },
		TokenTypeHint: { RefreshToken: "refresh_token" },
		makeRedirectUri: vi.fn(() => "anothertodo://auth/callback"),
		exchangeCodeAsync: vi.fn(async () => ({
			accessToken: "a1",
			refreshToken: "r1",
			expiresIn: 100,
		})),
		refreshAsync: vi.fn(async () => ({
			accessToken: "a2",
			refreshToken: undefined,
			expiresIn: undefined,
		})),
		revokeAsync: vi.fn(async () => true),
	};
});

vi.mock("expo-auth-session", () => session);

import { ExpoAuthorizationServer } from "../src/auth/expo-authorization-server";

const server = () =>
	new ExpoAuthorizationServer({
		authUrl: "https://auth.test",
		clientId: "client",
		scheme: "anothertodo",
		now: () => 1_000,
	});

describe("ExpoAuthorizationServer", () => {
	beforeEach(() => {
		session.state.requests.length = 0;
		session.state.promptResult = { type: "success", params: { code: "code-1" } };
	});

	it("runs the code flow with PKCE and converts the tokens", async () => {
		const tokens = await server().authorize();
		expect(tokens).toEqual({ accessToken: "a1", refreshToken: "r1", expiresAt: 1_000 + 100_000 });
		expect(session.state.requests[0]).toMatchObject({
			clientId: "client",
			redirectUri: "anothertodo://auth/callback",
			scopes: ["openid", "email", "profile"],
			usePKCE: true,
			extraParams: {},
		});
		expect(session.makeRedirectUri).toHaveBeenCalledWith({
			scheme: "anothertodo",
			path: "auth/callback",
		});
		expect(session.exchangeCodeAsync).toHaveBeenCalledWith(
			expect.objectContaining({ code: "code-1", extraParams: { code_verifier: "verifier-1" } }),
			expect.objectContaining({
				authorizationEndpoint: "https://auth.test/oauth2/authorize",
				tokenEndpoint: "https://auth.test/oauth2/token",
			}),
		);
	});

	it("passes the identity provider through to Cognito", async () => {
		await server().authorize("Microsoft");
		expect(session.state.requests[0]).toMatchObject({
			extraParams: { identity_provider: "Microsoft" },
		});
	});

	it("returns null when the user cancels", async () => {
		session.state.promptResult = { type: "dismiss" };
		expect(await server().authorize()).toBeNull();
	});

	it("refreshes with sensible defaults when Cognito omits fields", async () => {
		expect(await server().refresh("r1")).toEqual({
			accessToken: "a2",
			refreshToken: null,
			expiresAt: 1_000 + 3_600_000,
		});
	});

	it("revokes the refresh token", async () => {
		await server().revoke("r1");
		expect(session.revokeAsync).toHaveBeenCalledWith(
			expect.objectContaining({ token: "r1", tokenTypeHint: "refresh_token" }),
			expect.objectContaining({ revocationEndpoint: "https://auth.test/oauth2/revoke" }),
		);
	});
});
