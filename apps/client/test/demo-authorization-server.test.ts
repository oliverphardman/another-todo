import { describe, expect, it, vi } from "vitest";
import { DemoAuthorizationServer } from "../src/auth/demo-authorization-server";

function setup(response: Response) {
	const calls: { url: string; init: RequestInit }[] = [];
	const server = new DemoAuthorizationServer({
		region: "eu-west-1",
		clientId: "client",
		username: "default@example.com",
		password: "secret",
		now: () => 1_000,
		fetcher: async (url, init) => {
			calls.push({ url, init: init! });
			return response;
		},
	});
	return { server, calls };
}

const ok = (result: object) =>
	new Response(JSON.stringify({ AuthenticationResult: result }), { status: 200 });

describe("DemoAuthorizationServer", () => {
	it("signs in the default user with the password flow", async () => {
		const { server, calls } = setup(ok({ AccessToken: "a", RefreshToken: "r", ExpiresIn: 100 }));
		expect(await server.authorize()).toEqual({
			accessToken: "a",
			refreshToken: "r",
			expiresAt: 101_000,
		});
		expect(calls[0]!.url).toBe("https://cognito-idp.eu-west-1.amazonaws.com/");
		expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
			AuthFlow: "USER_PASSWORD_AUTH",
			ClientId: "client",
			AuthParameters: { USERNAME: "default@example.com", PASSWORD: "secret" },
		});
	});

	it("refreshes with the refresh token and defaults the lifetime", async () => {
		const { server, calls } = setup(ok({ AccessToken: "b" }));
		expect(await server.refresh("r1")).toEqual({
			accessToken: "b",
			refreshToken: null,
			expiresAt: 3_601_000,
		});
		expect(JSON.parse(calls[0]!.init.body as string).AuthParameters).toEqual({
			REFRESH_TOKEN: "r1",
		});
	});

	it("fails when Cognito refuses", async () => {
		const { server } = setup(new Response("{}", { status: 400 }));
		await expect(server.authorize()).rejects.toThrow("status 400");
	});

	it("has nothing to revoke", async () => {
		const { server } = setup(ok({}));
		await expect(server.revoke()).resolves.toBeUndefined();
	});

	it("uses the global fetch by default", async () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(ok({ AccessToken: "c" }));
		const server = new DemoAuthorizationServer({
			region: "eu-west-1",
			clientId: "client",
			username: "u",
			password: "p",
			now: () => 0,
		});
		expect((await server.authorize()).accessToken).toBe("c");
		fetchSpy.mockRestore();
	});
});
