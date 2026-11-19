import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, AuthRequiredError, NetworkError } from "../src/api/errors";
import type { AuthStatus } from "../src/auth/authentication-service";
import { Observable } from "../src/state/observable";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { LocalDatabase } from "../src/storage/local-database";
import { SyncCoordinator } from "../src/sync/sync-coordinator";
import { SyncEngine } from "../src/sync/sync-engine";
import { FakeGateway, FixedClock, ManualConnectivity } from "./support/fakes";

class StubAuth extends Observable<AuthStatus> {
	constructor(status: AuthStatus = "signedIn") {
		super(status);
	}

	setStatus(status: AuthStatus): void {
		this.set(status);
	}
}

function setup(online = true, status: AuthStatus = "signedIn") {
	const gateway = new FakeGateway();
	const connectivity = new ManualConnectivity(online);
	const clock = new FixedClock();
	const auth = new StubAuth(status);
	const coordinator = new SyncCoordinator(
		new SyncEngine(new LocalDatabase(new MemoryKeyValueStore()), gateway),
		connectivity,
		clock,
		auth,
	);
	return { gateway, connectivity, coordinator, clock, auth };
}

describe("SyncCoordinator", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not sync before a session exists, so startup cannot report an expired session", async () => {
		const { coordinator, gateway } = setup(true, "loading");
		coordinator.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toEqual([]);
		expect(coordinator.get().phase).toBe("idle");
		coordinator.stop();
	});

	it("syncs as soon as the session is restored or the user signs in", async () => {
		const { coordinator, gateway, auth } = setup(true, "loading");
		coordinator.start();
		auth.setStatus("signedIn");
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toContain("listTasks");
		expect(coordinator.get().phase).toBe("idle");
		coordinator.stop();
	});

	it("clears the sync state when the user signs out", async () => {
		const { coordinator, gateway, auth } = setup();
		gateway.failure = new AuthRequiredError();
		coordinator.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(coordinator.get().phase).toBe("unauthorized");
		auth.setStatus("signedOut");
		expect(coordinator.get()).toEqual({ phase: "idle", lastSyncedAt: null, rejected: 0 });
		auth.setStatus("loading");
		expect(coordinator.get().phase).toBe("idle");
		coordinator.stop();
	});

	it("syncs on start and records the time", async () => {
		const { coordinator, gateway, clock } = setup();
		coordinator.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toContain("listTasks");
		expect(coordinator.get()).toEqual({
			phase: "idle",
			lastSyncedAt: clock.now().toISOString(),
			rejected: 0,
		});
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
		expect(coordinator.get()).toEqual({ phase: "offline", lastSyncedAt: synced, rejected: 0 });
	});

	it("counts changes the server refused until they are dismissed", async () => {
		const { coordinator, gateway } = setup();
		const database = (coordinator as unknown as { engine: { database: LocalDatabase } }).engine
			.database;
		await database.apply((snapshot) => ({
			...snapshot,
			outbox: [{ kind: "deleteTask", opId: "d", taskId: "gone" }],
		}));
		gateway.failOnce.set("deleteTask:gone", new ApiError(404, "missing"));
		await coordinator.syncNow();
		expect(coordinator.get().rejected).toBe(1);
		coordinator.dismissRejected();
		expect(coordinator.get().rejected).toBe(0);
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
