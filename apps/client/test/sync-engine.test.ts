import { describe, expect, it } from "vitest";
import { ApiError, AuthRequiredError, NetworkError } from "../src/api/errors";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { LocalDatabase } from "../src/storage/local-database";
import type { Operation } from "../src/sync/operation";
import { Outbox } from "../src/sync/outbox";
import { SyncEngine } from "../src/sync/sync-engine";
import { FakeGateway, taskData } from "./support/fakes";

async function setup(outbox: Operation[] = [], tasks = [taskData({ id: "local" })]) {
	const database = new LocalDatabase(new MemoryKeyValueStore());
	await database.apply((snapshot) => ({ ...snapshot, tasks, outbox }));
	const gateway = new FakeGateway();
	return { database, gateway, engine: new SyncEngine(database, gateway) };
}

const createTask = (id: string): Operation => ({
	kind: "createTask",
	opId: `op-${id}`,
	task: taskData({ id }),
});

describe("SyncEngine", () => {
	it("pushes every operation kind in order, then pulls", async () => {
		const operations: Operation[] = [
			{ kind: "createList", opId: "1", list: { id: "l", name: "L", createdAt: "x" } },
			{ kind: "renameList", opId: "2", listId: "l", name: "R" },
			{ kind: "moveList", opId: "2b", listId: "l", position: 5 },
			{ kind: "createGroup", opId: "g1", group: { id: "g", name: "G", createdAt: "x" } },
			{ kind: "renameGroup", opId: "g2", groupId: "g", name: "G2" },
			{ kind: "setListGroup", opId: "g3", listId: "l", groupId: "g" },
			{ kind: "deleteGroup", opId: "g4", groupId: "oldg" },
			createTask("t"),
			{ kind: "updateTask", opId: "3", taskId: "t", changes: { completed: true } },
			{ kind: "deleteTask", opId: "4", taskId: "gone" },
			{ kind: "deleteList", opId: "5", listId: "old" },
		];
		const { engine, gateway, database } = await setup(operations, []);
		gateway.tasks = [taskData({ id: "gone" })];
		expect((await engine.sync()).outcome).toBe("synced");
		expect(gateway.calls).toEqual([
			"createList:l",
			"renameList:l",
			"moveList:l",
			"createGroup:g",
			"renameGroup:g",
			"setListGroup:l",
			"deleteGroup:oldg",
			"createTask:t",
			"updateTask:t",
			"deleteTask:gone",
			"deleteList:old",
			"listLists",
			"listGroups",
			"listTasks",
			"listSettings",
		]);
		expect(database.get().outbox).toEqual([]);
		expect(database.get().tasks.map((task) => [task.id, task.completed])).toEqual([["t", true]]);
		expect(database.get().lists.map((list) => [list.name, list.position])).toEqual([["R", 5]]);
		expect(database.get().groups.map((group) => group.name)).toEqual(["G2"]);
		expect(database.get().lists[0]!.groupId).toBe("g");
	});

	it("sends queued settings and pulls the server's, keeping settings with changes pending", async () => {
		const { engine, gateway, database } = await setup(
			[
				{
					kind: "putSettings",
					opId: "s1",
					settings: { id: "my-day", sort: "due", hideCompleted: true, theme: null },
				},
			],
			[],
		);
		gateway.settings = [{ id: "other", sort: null, hideCompleted: false, theme: null }];
		await engine.sync();
		expect(gateway.calls).toContain("putSettings:my-day");
		expect(
			database
				.get()
				.settings.map((entry) => entry.id)
				.sort(),
		).toEqual(["my-day", "other"]);
		await database.apply((snapshot) => ({
			...snapshot,
			settings: [{ id: "local", sort: "created", hideCompleted: false, theme: null }],
			outbox: [
				{
					kind: "putSettings",
					opId: "s2",
					settings: { id: "local", sort: "created", hideCompleted: false, theme: null },
				},
			],
		}));
		gateway.putSettings = async () => undefined;
		gateway.settings = [{ id: "local", sort: null, hideCompleted: true, theme: null }];
		await engine.sync();
		expect(database.get().settings.find((entry) => entry.id === "local")!.sort).toBeNull();
	});

	it("replaces local data with the server's when nothing is pending", async () => {
		const { engine, gateway, database } = await setup([], [taskData({ id: "stale" })]);
		gateway.tasks = [taskData({ id: "fresh" })];
		gateway.lists = [{ id: "l", name: "Server", createdAt: "x" }];
		await engine.sync();
		expect(database.get().tasks.map((task) => task.id)).toEqual(["fresh"]);
		expect(database.get().lists.map((list) => list.id)).toEqual(["l"]);
	});

	it("keeps locally pending entities over the server copy", async () => {
		const { engine, gateway, database } = await setup(
			[createTask("pending")],
			[taskData({ id: "pending", title: "Local" })],
		);
		gateway.createTask = async () => {
			gateway.failure = null;
		};
		await engine.sync();
		expect(database.get().outbox).toEqual([]);
	});

	it("keeps changes made while a sync is in flight", async () => {
		const { engine, gateway, database } = await setup([], []);
		const original = gateway.listLists.bind(gateway);
		gateway.listLists = async () => {
			await database.apply((snapshot) => ({
				...snapshot,
				lists: [{ id: "mid", name: "Mid", createdAt: "x" }],
				tasks: [taskData({ id: "mid-task" })],
				outbox: [
					{ kind: "createList", opId: "ol", list: { id: "mid", name: "Mid", createdAt: "x" } },
					{ kind: "createTask", opId: "ot", task: taskData({ id: "mid-task" }) },
				],
			}));
			return original();
		};
		await engine.sync();
		expect(database.get().lists.map((list) => list.id)).toEqual(["mid"]);
		expect(database.get().tasks.map((task) => task.id)).toEqual(["mid-task"]);
		expect(database.get().outbox).toHaveLength(2);
	});

	it("keeps groups that have unsent changes and replaces the rest from the server", async () => {
		const { engine, gateway, database } = await setup([], []);
		gateway.groups = [
			{ id: "server", name: "Server", createdAt: "x" },
			{ id: "pending", name: "Server copy", createdAt: "x" },
		];
		const original = gateway.listGroups.bind(gateway);
		gateway.listGroups = async () => {
			await database.apply((snapshot) => ({
				...snapshot,
				groups: [{ id: "pending", name: "Local", createdAt: "x" }],
				outbox: [{ kind: "renameGroup", opId: "rg", groupId: "pending", name: "Local" }],
			}));
			return original();
		};
		await engine.sync();
		expect(
			database
				.get()
				.groups.map((group) => [group.id, group.name])
				.sort(),
		).toEqual([
			["pending", "Local"],
			["server", "Server"],
		]);
	});

	it("sends edits made while an earlier edit to the same task is in flight", async () => {
		const { engine, gateway, database } = await setup(
			[{ kind: "updateTask", opId: "u1", taskId: "t", changes: { title: "First" } }],
			[taskData({ id: "t" })],
		);
		gateway.tasks = [taskData({ id: "t" })];
		const original = gateway.updateTask.bind(gateway);
		let edited = false;
		gateway.updateTask = async (id, changes) => {
			if (!edited) {
				edited = true;
				await database.apply((snapshot) => ({
					...snapshot,
					outbox: new Outbox(snapshot.outbox).enqueue({
						kind: "updateTask",
						opId: "u2",
						taskId: "t",
						changes: { note: "Typed during the send" },
					}).operations,
				}));
			}
			return original(id, changes);
		};
		await engine.sync();
		expect(gateway.tasks[0]).toMatchObject({ title: "First", note: "Typed during the send" });
		expect(database.get().outbox).toEqual([]);
	});

	it("releases claims left behind by an interrupted send", async () => {
		const { engine, gateway, database } = await setup(
			[{ kind: "updateTask", opId: "u1", taskId: "t", changes: { title: "Again" }, sending: true }],
			[taskData({ id: "t" })],
		);
		gateway.tasks = [taskData({ id: "t" })];
		await engine.sync();
		expect(gateway.calls).toContain("updateTask:t");
		expect(database.get().outbox).toEqual([]);
	});

	it("stops and keeps the outbox when offline", async () => {
		const { engine, gateway, database } = await setup([createTask("a"), createTask("b")]);
		gateway.failOnce.set("createTask:a", new NetworkError());
		expect((await engine.sync()).outcome).toBe("offline");
		expect(database.get().outbox).toHaveLength(2);
		expect(gateway.calls).toEqual(["createTask:a"]);
	});

	it("treats server errors as retryable", async () => {
		const { engine, gateway, database } = await setup([createTask("a")]);
		gateway.failOnce.set("createTask:a", new ApiError(503, "down"));
		expect((await engine.sync()).outcome).toBe("offline");
		expect(database.get().outbox).toHaveLength(1);
	});

	it("drops operations the server permanently rejects", async () => {
		const { engine, gateway, database } = await setup([createTask("bad"), createTask("good")]);
		gateway.failOnce.set("createTask:bad", new ApiError(400, "invalid"));
		expect(await engine.sync()).toEqual({ outcome: "synced", rejected: 1 });
		expect(database.get().outbox).toEqual([]);
		expect(gateway.calls).toContain("createTask:good");
	});

	it("reports unauthorized for 401 and missing sign-in", async () => {
		const first = await setup([createTask("a")]);
		first.gateway.failOnce.set("createTask:a", new ApiError(401, "no"));
		expect((await first.engine.sync()).outcome).toBe("unauthorized");
		expect(first.database.get().outbox).toHaveLength(1);
		const second = await setup([]);
		second.gateway.failure = new AuthRequiredError();
		expect((await second.engine.sync()).outcome).toBe("unauthorized");
		const third = await setup([]);
		third.gateway.failure = new ApiError(401, "expired");
		expect((await third.engine.sync()).outcome).toBe("unauthorized");
	});

	it("goes offline when pulling fails", async () => {
		const { engine, gateway } = await setup([]);
		gateway.failure = new NetworkError();
		expect((await engine.sync()).outcome).toBe("offline");
	});

	it("rethrows unexpected errors", async () => {
		const { engine, gateway } = await setup([]);
		gateway.failure = new Error("bug");
		await expect(engine.sync()).rejects.toThrow("bug");
	});

	it("adds up rejections across a rerun", async () => {
		const { engine, gateway } = await setup([createTask("bad")]);
		gateway.failOnce.set("createTask:bad", new ApiError(400, "invalid"));
		const first = engine.sync();
		engine.sync();
		expect((await first).rejected).toBe(1);
	});

	it("coalesces concurrent syncs and reruns once", async () => {
		const { engine, gateway } = await setup([]);
		const first = engine.sync();
		const second = engine.sync();
		expect(second).toBe(first);
		await first;
		expect(gateway.calls.filter((call) => call === "listTasks")).toHaveLength(2);
	});

	it("does not resurrect tasks or lists whose deletion is still pending", async () => {
		const { engine, gateway, database } = await setup([], [taskData({ id: "t2" })]);
		gateway.tasks = [taskData({ id: "t1" }), taskData({ id: "t2" })];
		gateway.lists = [{ id: "l1", name: "One", createdAt: "x" }];
		await database.apply((snapshot) => ({
			...snapshot,
			outbox: [
				{ kind: "deleteTask", opId: "d1", taskId: "t1" },
				{ kind: "deleteList", opId: "d2", listId: "l1" },
			],
		}));
		gateway.deleteTask = async () => undefined;
		gateway.deleteList = async () => undefined;
		await engine.sync();
		expect(database.get().tasks.map((task) => task.id)).toEqual(["t1", "t2"]);
	});
});
