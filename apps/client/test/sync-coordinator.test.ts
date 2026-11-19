import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkError } from "../src/api/errors";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { LocalDatabase } from "../src/storage/local-database";
import { SyncCoordinator } from "../src/sync/sync-coordinator";
import { SyncEngine } from "../src/sync/sync-engine";
import { FakeGateway, FixedClock, ManualConnectivity } from "./support/fakes";

function setup(online = true) {
	const gateway = new FakeGateway();
	const connectivity = new ManualConnectivity(online);
	const clock = new FixedClock();
	const coordinator = new SyncCoordinator(
		new SyncEngine(new LocalDatabase(new MemoryKeyValueStore()), gateway),
		connectivity,
		clock,
	);
	return { gateway, connectivity, coordinator, clock };
}

describe("SyncCoordinator", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("syncs on start and records the time", async () => {
		const { coordinator, gateway, clock } = setup();
		coordinator.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toContain("listTasks");
		expect(coordinator.get()).toEqual({ phase: "idle", lastSyncedAt: clock.now().toISOString() });
		coordinator.stop();
	});

	it("reports offline without calling the server", async () => {
		const { coordinator, gateway } = setup(false);
		await coordinator.syncNow();
		expect(coordinator.get().phase).toBe("offline");
		expect(gateway.calls).toEqual([]);
		coordinator.request();
		expect(coordinator.get().phase).toBe("offline");
	});

	it("syncs again when the connection returns and marks offline when it drops", async () => {
		const { coordinator, gateway, connectivity } = setup();
		coordinator.start();
		await vi.advanceTimersByTimeAsync(0);
		gateway.calls = [];
		connectivity.setOnline(false);
		expect(coordinator.get().phase).toBe("offline");
		connectivity.setOnline(true);
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toContain("listTasks");
		expect(coordinator.get().phase).toBe("idle");
		coordinator.stop();
	});

	it("debounces requests", async () => {
		const { coordinator, gateway } = setup();
		coordinator.request();
		coordinator.request();
		coordinator.request();
		await vi.advanceTimersByTimeAsync(300);
		expect(gateway.calls.filter((call) => call === "listTasks")).toHaveLength(1);
	});

	it("polls while online and skips polling while offline", async () => {
		const { coordinator, gateway, connectivity } = setup();
		coordinator.start();
		await vi.advanceTimersByTimeAsync(0);
		gateway.calls = [];
		await vi.advanceTimersByTimeAsync(60_000);
		expect(gateway.calls).toContain("listTasks");
		gateway.calls = [];
		connectivity.setOnline(false);
		await vi.advanceTimersByTimeAsync(60_000);
		expect(gateway.calls).toEqual([]);
		coordinator.stop();
	});

	it("keeps the previous sync time when a sync fails", async () => {
		const { coordinator, gateway } = setup();
		await coordinator.syncNow();
		const synced = coordinator.get().lastSyncedAt;
		gateway.failure = new NetworkError();
		await coordinator.syncNow();
		expect(coordinator.get()).toEqual({ phase: "offline", lastSyncedAt: synced });
	});

	it("stops listening and clears timers", async () => {
		const { coordinator, connectivity } = setup();
		coordinator.start();
		coordinator.request();
		expect(connectivity.listenerCount).toBe(1);
		coordinator.stop();
		expect(connectivity.listenerCount).toBe(0);
		coordinator.stop();
	});

	it("restarts cleanly", async () => {
		const { coordinator, connectivity } = setup();
		coordinator.start();
		coordinator.start();
		expect(connectivity.listenerCount).toBe(1);
		coordinator.stop();
	});
});
