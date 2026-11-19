import { describe, expect, it, vi } from "vitest";
import { EMPTY_SNAPSHOT, LocalDatabase } from "../src/storage/local-database";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { taskData } from "./support/fakes";

describe("LocalDatabase", () => {
	it("starts empty when nothing is stored", async () => {
		const database = new LocalDatabase(new MemoryKeyValueStore());
		await database.load();
		expect(database.get()).toEqual(EMPTY_SNAPSHOT);
	});

	it("persists mutations and restores them", async () => {
		const store = new MemoryKeyValueStore();
		const database = new LocalDatabase(store);
		const listener = vi.fn();
		database.subscribe(listener);
		await database.apply((snapshot) => ({ ...snapshot, tasks: [taskData({ id: "1" })] }));
		expect(listener).toHaveBeenCalledTimes(1);
		const restored = new LocalDatabase(store);
		await restored.load();
		expect(restored.get().tasks).toHaveLength(1);
	});

	it("serializes overlapping writes in order", async () => {
		const store = new MemoryKeyValueStore();
		const database = new LocalDatabase(store);
		const first = database.apply((snapshot) => ({ ...snapshot, tasks: [taskData({ id: "1" })] }));
		const second = database.apply((snapshot) => ({
			...snapshot,
			tasks: [...snapshot.tasks, taskData({ id: "2" })],
		}));
		await Promise.all([first, second]);
		const restored = new LocalDatabase(store);
		await restored.load();
		expect(restored.get().tasks.map((task) => task.id)).toEqual(["1", "2"]);
	});

	it("discards corrupt or unknown versions", async () => {
		const corrupt = new MemoryKeyValueStore();
		await corrupt.set("atd.snapshot", "{not json");
		const database = new LocalDatabase(corrupt);
		await database.load();
		expect(database.get()).toEqual(EMPTY_SNAPSHOT);
		expect(await corrupt.get("atd.snapshot")).toBeNull();
		const future = new MemoryKeyValueStore();
		await future.set(
			"atd.snapshot",
			JSON.stringify({ version: 2, lists: [], tasks: [], outbox: [] }),
		);
		const other = new LocalDatabase(future);
		await other.load();
		expect(other.get()).toEqual(EMPTY_SNAPSHOT);
	});

	it("loads snapshots saved before settings existed", async () => {
		const store = new MemoryKeyValueStore();
		await store.set(
			"atd.snapshot",
			JSON.stringify({ version: 1, lists: [], tasks: [], outbox: [] }),
		);
		const database = new LocalDatabase(store);
		await database.load();
		expect(database.get().settings).toEqual([]);
	});

	it("clears everything", async () => {
		const store = new MemoryKeyValueStore();
		const database = new LocalDatabase(store);
		await database.apply((snapshot) => ({ ...snapshot, tasks: [taskData({ id: "1" })] }));
		await database.clear();
		expect(database.get()).toEqual(EMPTY_SNAPSHOT);
		expect(await store.get("atd.snapshot")).toBeNull();
	});
});
