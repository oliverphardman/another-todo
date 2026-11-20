import { describe, expect, it } from "vitest";
import { AuthRequiredError } from "../src/api/errors";
import { AuthenticationService } from "../src/auth/authentication-service";
import { TokenRepository } from "../src/auth/token-repository";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { FakeAuthorizationServer, FixedClock } from "./support/fakes";

function setup() {
	const server = new FakeAuthorizationServer();
	const store = new MemoryKeyValueStore();
	const clock = new FixedClock();
	const repository = new TokenRepository(store);
	const service = new AuthenticationService(server, repository, clock);
	return { server, store, clock, repository, service };
}

describe("AuthenticationService", () => {
	it("starts loading and resolves to signed out without tokens", async () => {
		const { service } = setup();
		expect(service.get()).toBe("loading");
		await service.restore();
		expect(service.get()).toBe("signedOut");
		await expect(service.getAccessToken()).rejects.toBeInstanceOf(AuthRequiredError);
	});

	it("signs in by itself when automatic", async () => {
		const server = new FakeAuthorizationServer();
		const service = new AuthenticationService(
			server,
			new TokenRepository(new MemoryKeyValueStore()),
			new FixedClock(),
			true,
		);
		await service.restore();
		expect(service.get()).toBe("signedIn");
		expect(server.authorizeCalls).toEqual([undefined]);
	});

	it("falls back to signed out when automatic sign-in fails", async () => {
		const server = new FakeAuthorizationServer();
		server.authorize = async () => {
			throw new Error("down");
		};
		const service = new AuthenticationService(
			server,
			new TokenRepository(new MemoryKeyValueStore()),
			new FixedClock(),
			true,
		);
		await service.restore();
		expect(service.get()).toBe("signedOut");
	});

	it("restores a stored session", async () => {
		const { service, repository, clock } = setup();
		await repository.save({
			accessToken: "a",
			refreshToken: "r",
			expiresAt: clock.now().getTime() + 600_000,
		});
		await service.restore();
		expect(service.get()).toBe("signedIn");
		expect(await service.getAccessToken()).toBe("a");
	});

	it("signs in, optionally with a provider, and ignores cancelled sign-ins", async () => {
		const { service, server } = setup();
		await service.signIn("Google");
		expect(server.authorizeCalls).toEqual(["Google"]);
		expect(service.get()).toBe("signedIn");
		const cancelled = setup();
		cancelled.server.authorizeResult = null;
		await cancelled.service.signIn();
		expect(cancelled.service.get()).toBe("loading");
	});

	it("refreshes an expiring token once, even for concurrent callers", async () => {
		const { service, server, repository, clock } = setup();
		await repository.save({
			accessToken: "old",
			refreshToken: "r1",
			expiresAt: clock.now().getTime() + 10_000,
		});
		await service.restore();
		const [first, second] = await Promise.all([service.getAccessToken(), service.getAccessToken()]);
		expect([first, second]).toEqual(["access-2", "access-2"]);
		expect(server.refreshCalls).toBe(1);
		expect((await repository.load())?.refreshToken).toBe("r1");
	});

	it("adopts a rotated refresh token", async () => {
		const { service, server, repository, clock } = setup();
		server.refreshResult = {
			accessToken: "n",
			refreshToken: "r2",
			expiresAt: clock.now().getTime() + 600_000,
		};
		await repository.save({ accessToken: "old", refreshToken: "r1", expiresAt: 0 });
		await service.restore();
		await service.getAccessToken();
		expect((await repository.load())?.refreshToken).toBe("r2");
	});

	it("signs out when the token cannot be refreshed", async () => {
		const withFailure = setup();
		withFailure.server.refreshResult = new Error("revoked");
		await withFailure.repository.save({ accessToken: "old", refreshToken: "r", expiresAt: 0 });
		await withFailure.service.restore();
		await expect(withFailure.service.getAccessToken()).rejects.toBeInstanceOf(AuthRequiredError);
		expect(withFailure.service.get()).toBe("signedOut");
		expect(await withFailure.repository.load()).toBeNull();
		const withoutRefresh = setup();
		await withoutRefresh.repository.save({ accessToken: "old", refreshToken: null, expiresAt: 0 });
		await withoutRefresh.service.restore();
		await expect(withoutRefresh.service.getAccessToken()).rejects.toBeInstanceOf(AuthRequiredError);
		expect(withoutRefresh.service.get()).toBe("signedOut");
	});

	it("signs out, revoking the refresh token on a best effort basis", async () => {
		const { service, server, repository } = setup();
		await service.signIn();
		await service.signOut();
		expect(server.revoked).toEqual(["refresh-1"]);
		expect(service.get()).toBe("signedOut");
		expect(await repository.load()).toBeNull();
		await service.signIn();
		server.revokeError = new Error("offline");
		await service.signOut();
		expect(service.get()).toBe("signedOut");
		await service.signOut();
		expect(server.revoked).toHaveLength(2);
	});
});

describe("TokenRepository", () => {
	it("round-trips tokens", async () => {
		const repository = new TokenRepository(new MemoryKeyValueStore());
		await repository.save({ accessToken: "a", refreshToken: null, expiresAt: 5 });
		expect(await repository.load()).toEqual({ accessToken: "a", refreshToken: null, expiresAt: 5 });
		await repository.clear();
		expect(await repository.load()).toBeNull();
	});

	it("ignores malformed values", async () => {
		const store = new MemoryKeyValueStore();
		const repository = new TokenRepository(store);
		await store.set("atd.tokens", "{broken");
		expect(await repository.load()).toBeNull();
		await store.set("atd.tokens", JSON.stringify({ accessToken: 1 }));
		expect(await repository.load()).toBeNull();
		await store.set("atd.tokens", JSON.stringify({ accessToken: "a", expiresAt: 1 }));
		expect((await repository.load())?.refreshToken).toBeNull();
	});
});
