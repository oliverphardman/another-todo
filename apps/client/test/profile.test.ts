import { describe, expect, it } from "vitest";
import { AuthenticationService } from "../src/auth/authentication-service";
import { DesktopAuthorizationServer } from "../src/auth/desktop-authorization-server";
import { JwtClaims } from "../src/auth/jwt-claims";
import { Profiles } from "../src/auth/profile";
import { TokenRepository } from "../src/auth/token-repository";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { FakeAuthorizationServer, FixedClock } from "./support/fakes";

const token = (claims: unknown) =>
	`h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;

describe("JwtClaims", () => {
	it("reads claims, including names outside ASCII", () => {
		expect(JwtClaims.read(token({ name: "Zoë Łukasz 🙂" }))).toEqual({ name: "Zoë Łukasz 🙂" });
	});

	it("reads nothing from anything that is not a token with an object payload", () => {
		for (const value of ["", "opaque", "a.!!!.c", token(null), token(4)]) {
			expect(JwtClaims.read(value)).toEqual({});
		}
	});
});

describe("Profiles", () => {
	it("takes the name and email from an ID token", () => {
		expect(Profiles.fromIdToken(token({ name: " Ada Lovelace ", email: "ada@x.test" }))).toEqual({
			name: "Ada Lovelace",
			email: "ada@x.test",
		});
		expect(Profiles.fromIdToken(token({ given_name: "Ada", family_name: "King" }))).toEqual({
			name: "Ada King",
			email: null,
		});
		expect(Profiles.fromIdToken(token({ email: "ada@x.test", name: "" }))).toEqual({
			name: null,
			email: "ada@x.test",
		});
		expect(Profiles.fromIdToken(undefined)).toBeUndefined();
		expect(Profiles.fromIdToken(null)).toBeUndefined();
	});

	it("shortens a name to its initials", () => {
		expect(Profiles.initials({ name: "ada byron king", email: null })).toBe("AK");
		expect(Profiles.initials({ name: "Ada", email: null })).toBe("A");
		expect(Profiles.initials({ name: null, email: "zed@x.test" })).toBe("Z");
		expect(Profiles.initials({ name: null, email: null })).toBe("");
	});

	it("comes back from storage and survives a refresh that omits it", async () => {
		const store = new MemoryKeyValueStore();
		const clock = new FixedClock();
		const server = new FakeAuthorizationServer();
		server.authorizeResult = {
			accessToken: "a",
			refreshToken: "r",
			expiresAt: clock.now().getTime(),
			profile: { name: "Ada", email: "ada@x.test" },
		};
		const service = () => new AuthenticationService(server, new TokenRepository(store), clock);
		const first = service();
		expect(first.profile).toBeNull();
		await first.signIn();
		const second = service();
		await second.restore();
		expect(second.profile).toEqual({ name: "Ada", email: "ada@x.test" });
		expect(await second.getAccessToken()).toBe("access-2");
		expect(second.profile).toEqual({ name: "Ada", email: "ada@x.test" });
		await second.signOut();
		expect(second.profile).toBeNull();
	});

	it("is read from the ID token on desktop", async () => {
		const server = new DesktopAuthorizationServer(
			{ authUrl: "https://auth.test", clientId: "c", scheme: "anothertodo", now: () => 0 },
			{
				fetcher: async () =>
					new Response(
						JSON.stringify({ access_token: "a", id_token: token({ email: "d@x.test" }) }),
					),
			},
		);
		expect((await server.refresh("r")).profile).toEqual({ name: null, email: "d@x.test" });
	});
});
