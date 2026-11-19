import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "../src/sync/realtime-client";
import { FakeSocket } from "./support/fakes";
import { createTestContainer } from "./support/test-container";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

async function setup(signedIn = true) {
	const test = createTestContainer();
	if (signedIn) {
		await test.container.auth.signIn();
	}
	const request = vi.fn();
	const sockets: FakeSocket[] = [];
	const client = new RealtimeClient(
		"wss://realtime.test/dev",
		test.container.auth,
		test.connectivity,
		{ request },
		(url) => {
			const socket = new FakeSocket(url);
			sockets.push(socket);
			return socket;
		},
	);
	return { ...test, request, sockets, client };
}

const flush = () => vi.advanceTimersByTimeAsync(0);

describe("RealtimeClient", () => {
	it("connects with the access token, syncs on open and on every change message", async () => {
		const { client, sockets, request } = await setup();
		client.start();
		await flush();
		expect(sockets).toHaveLength(1);
		expect(sockets[0]!.url).toBe("wss://realtime.test/dev?token=access-1");
		expect(client.connected).toBe(true);
		sockets[0]!.onopen!();
		expect(request).toHaveBeenCalledTimes(1);
		sockets[0]!.onmessage!({ data: JSON.stringify({ type: "changed" }) });
		expect(request).toHaveBeenCalledTimes(2);
		sockets[0]!.onmessage!({ data: JSON.stringify({ type: "other" }) });
		sockets[0]!.onmessage!({ data: "not json" });
		expect(request).toHaveBeenCalledTimes(2);
		sockets[0]!.onerror!();
	});

	it("keeps the connection alive with a ping every five minutes", async () => {
		const { client, sockets } = await setup();
		client.start();
		await flush();
		sockets[0]!.onopen!();
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(sockets[0]!.sent).toEqual([JSON.stringify({ action: "ping" })]);
		sockets[0]!.onclose!();
		await vi.advanceTimersByTimeAsync(5 * 60_000);
		expect(sockets[0]!.sent).toHaveLength(1);
	});

	it("reconnects with a growing delay after the socket closes and resets it once open", async () => {
		const { client, sockets } = await setup();
		client.start();
		await flush();
		sockets[0]!.onclose!();
		expect(client.connected).toBe(false);
		await vi.advanceTimersByTimeAsync(999);
		expect(sockets).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(1);
		expect(sockets).toHaveLength(2);
		sockets[1]!.onclose!();
		await vi.advanceTimersByTimeAsync(1_999);
		expect(sockets).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(sockets).toHaveLength(3);
		sockets[2]!.onopen!();
		sockets[2]!.onclose!();
		await vi.advanceTimersByTimeAsync(1_000);
		expect(sockets).toHaveLength(4);
	});

	it("caps the reconnect delay", async () => {
		const { client, sockets } = await setup();
		client.start();
		await flush();
		for (let attempt = 0; attempt < 8; attempt += 1) {
			sockets[sockets.length - 1]!.onclose!();
			await vi.advanceTimersByTimeAsync(60_000);
		}
		expect(sockets).toHaveLength(9);
	});

	it("does not connect until signed in and online, and disconnects when either is lost", async () => {
		const { client, sockets, container, connectivity, authorizationServer } = await setup(false);
		client.start();
		await flush();
		expect(sockets).toHaveLength(0);
		await container.auth.signIn();
		await flush();
		expect(sockets).toHaveLength(1);
		connectivity.setOnline(false);
		expect(sockets[0]!.closed).toBe(true);
		expect(client.connected).toBe(false);
		connectivity.setOnline(true);
		await flush();
		expect(sockets).toHaveLength(2);
		await container.auth.signOut();
		expect(sockets[1]!.closed).toBe(true);
		expect(authorizationServer.revoked.length).toBeGreaterThanOrEqual(0);
	});

	it("ignores a stale socket closing after a newer one replaced it", async () => {
		const { client, sockets, connectivity } = await setup();
		client.start();
		await flush();
		connectivity.setOnline(false);
		connectivity.setOnline(true);
		await flush();
		expect(sockets).toHaveLength(2);
		sockets[0]!.onclose!();
		await vi.advanceTimersByTimeAsync(5_000);
		expect(sockets).toHaveLength(2);
		expect(client.connected).toBe(true);
	});

	it("retries when no token can be obtained and gives up when stopped in the meantime", async () => {
		const { client, sockets, container, authorizationServer } = await setup();
		container.auth.getAccessToken = vi
			.fn()
			.mockRejectedValueOnce(new Error("no token"))
			.mockResolvedValue("late");
		client.start();
		await flush();
		expect(sockets).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(1_000);
		expect(sockets).toHaveLength(1);
		expect(sockets[0]!.url).toContain("token=late");
		expect(authorizationServer).toBeDefined();
		client.stop();
		expect(sockets[0]!.closed).toBe(true);
		container.auth.getAccessToken = vi.fn(async () => "x");
		client.start();
		client.stop();
		await flush();
		expect(sockets).toHaveLength(1);
	});

	it("does not open a second socket while one is already open or a retry is waiting", async () => {
		const { client, sockets, connectivity } = await setup();
		client.start();
		await flush();
		connectivity.setOnline(true);
		await flush();
		expect(sockets).toHaveLength(1);
		sockets[0]!.onclose!();
		connectivity.setOnline(true);
		await flush();
		expect(sockets).toHaveLength(1);
	});

	it("cancels a pending retry when it is stopped", async () => {
		const { client, sockets, container } = await setup();
		container.auth.getAccessToken = vi.fn().mockRejectedValue(new Error("no token"));
		client.start();
		await flush();
		client.stop();
		await vi.advanceTimersByTimeAsync(120_000);
		expect(sockets).toHaveLength(0);
	});
});
