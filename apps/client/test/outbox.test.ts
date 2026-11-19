import { describe, expect, it } from "vitest";
import type { Operation } from "../src/sync/operation";
import { Outbox } from "../src/sync/outbox";
import { taskData } from "./support/fakes";

const createTask = (id: string, opId = `op-${id}`): Operation => ({
	kind: "createTask",
	opId,
	task: taskData({ id }),
});
const updateTask = (taskId: string, changes: object, opId = `u-${taskId}`): Operation => ({
	kind: "updateTask",
	opId,
	taskId,
	changes,
});
const deleteTask = (taskId: string): Operation => ({
	kind: "deleteTask",
	opId: `d-${taskId}`,
	taskId,
});
const createList = (id: string): Operation => ({
	kind: "createList",
	opId: `cl-${id}`,
	list: { id, name: "L", createdAt: "x" },
});
const renameList = (listId: string, name: string, opId = `r-${listId}`): Operation => ({
	kind: "renameList",
	opId,
	listId,
	name,
});
const deleteList = (listId: string): Operation => ({
	kind: "deleteList",
	opId: `dl-${listId}`,
	listId,
});

function build(...operations: Operation[]): Outbox {
	return operations.reduce((outbox, operation) => outbox.enqueue(operation), new Outbox());
}

describe("Outbox", () => {
	it("starts empty and appends creates", () => {
		expect(new Outbox().isEmpty).toBe(true);
		expect(build(createTask("1"), createList("l")).operations).toHaveLength(2);
	});

	it("folds updates into a pending create", () => {
		const outbox = build(createTask("1"), updateTask("1", { title: "New" }));
		expect(outbox.operations).toHaveLength(1);
		expect((outbox.operations[0] as { task: { title: string } }).task.title).toBe("New");
	});

	it("merges consecutive updates, later values winning", () => {
		const outbox = build(
			updateTask("1", { title: "A", completed: true }),
			updateTask("1", { title: "B" }),
		);
		expect(outbox.operations).toHaveLength(1);
		expect((outbox.operations[0] as { changes: object }).changes).toEqual({
			title: "B",
			completed: true,
		});
	});

	it("keeps updates for different tasks separate", () => {
		expect(
			build(updateTask("1", { title: "A" }), updateTask("2", { title: "B" })).operations,
		).toHaveLength(2);
	});

	it("does not merge across list operations", () => {
		const outbox = build(createTask("1"), createList("l"), updateTask("1", { listId: "l" }));
		expect(outbox.operations.map((operation) => operation.kind)).toEqual([
			"createTask",
			"createList",
			"updateTask",
		]);
		const renamed = build(
			updateTask("1", { title: "A" }),
			renameList("l", "N"),
			updateTask("1", { listId: "l" }),
		);
		expect(renamed.operations).toHaveLength(3);
		const deleted = build(
			updateTask("1", { title: "A" }),
			deleteList("l"),
			updateTask("1", { title: "B" }),
		);
		expect(deleted.operations).toHaveLength(3);
	});

	it("merges past unrelated task operations", () => {
		const outbox = build(
			updateTask("1", { title: "A" }),
			createTask("2"),
			updateTask("1", { completed: true }),
		);
		expect(outbox.operations).toHaveLength(2);
	});

	it("drops everything for a task that was never synced when it is deleted", () => {
		const outbox = build(
			createTask("1"),
			updateTask("1", { title: "A" }),
			createTask("2"),
			deleteTask("1"),
		);
		expect(outbox.operations.map((operation) => operation.opId)).toEqual(["op-2"]);
	});

	it("replaces pending updates with a delete for a synced task", () => {
		const outbox = build(updateTask("1", { title: "A" }), deleteTask("1"));
		expect(outbox.operations.map((operation) => operation.kind)).toEqual(["deleteTask"]);
	});

	it("folds list renames into a pending create and replaces earlier renames", () => {
		const folded = build(createList("l"), renameList("l", "Renamed"));
		expect(folded.operations).toHaveLength(1);
		expect((folded.operations[0] as { list: { name: string } }).list.name).toBe("Renamed");
		const replaced = build(
			renameList("l", "One"),
			renameList("l", "Two"),
			renameList("m", "Other"),
		);
		expect(replaced.operations).toHaveLength(2);
		expect((replaced.operations[0] as { name: string }).name).toBe("Two");
	});

	it("drops a never synced list entirely when it is deleted", () => {
		expect(build(createList("l"), deleteList("l")).isEmpty).toBe(true);
	});

	it("keeps a delete for a synced list and discards its rename", () => {
		const outbox = build(renameList("l", "N"), createList("m"), deleteList("l"));
		expect(outbox.operations.map((operation) => operation.kind)).toEqual([
			"createList",
			"deleteList",
		]);
	});

	it("never merges an update into an operation that is already being sent", () => {
		const sendingUpdate = build(updateTask("1", { title: "A" })).markSending("u-1");
		const next = sendingUpdate.enqueue(updateTask("1", { completed: true }, "u-1b"));
		expect(next.operations.map((operation) => operation.opId)).toEqual(["u-1", "u-1b"]);
		expect((next.operations[0] as { changes: object }).changes).toEqual({ title: "A" });
		const sendingCreate = build(createTask("2")).markSending("op-2");
		const afterCreate = sendingCreate.enqueue(updateTask("2", { title: "B" }, "u-2"));
		expect(afterCreate.operations.map((operation) => operation.kind)).toEqual([
			"createTask",
			"updateTask",
		]);
		expect((afterCreate.operations[0] as { task: { title: string } }).task.title).toBe("Task 2");
	});

	it("still sends a delete for a task whose create is already on its way", () => {
		const outbox = build(createTask("1")).markSending("op-1").enqueue(deleteTask("1"));
		expect(outbox.operations.map((operation) => operation.kind)).toEqual(["deleteTask"]);
		const unsent = build(createTask("2")).enqueue(deleteTask("2"));
		expect(unsent.isEmpty).toBe(true);
	});

	it("keeps list operations that are being sent apart from new ones", () => {
		const creating = build(createList("l")).markSending("cl-l");
		const renamed = creating.enqueue(renameList("l", "New name"));
		expect(renamed.operations.map((operation) => operation.kind)).toEqual([
			"createList",
			"renameList",
		]);
		const deleted = creating.enqueue(deleteList("l"));
		expect(deleted.operations.map((operation) => operation.kind)).toEqual(["deleteList"]);
		const renaming = build(renameList("m", "One")).markSending("r-m");
		const again = renaming.enqueue(renameList("m", "Two", "r-m2"));
		expect(again.operations.map((operation) => operation.opId)).toEqual(["r-m", "r-m2"]);
	});

	it("keeps only the latest unsent settings for each view", () => {
		const put = (id: string, sort: "due" | "created" | null, opId: string): Operation => ({
			kind: "putSettings",
			opId,
			settings: { id, sort, hideCompleted: false, theme: null },
		});
		const outbox = build(put("a", "due", "p1"), put("b", null, "p2"), put("a", "created", "p3"));
		expect(outbox.operations.map((operation) => operation.opId)).toEqual(["p2", "p3"]);
		expect([...outbox.pendingSettingsIds()].sort()).toEqual(["a", "b"]);
		const sending = build(put("a", "due", "p1"))
			.markSending("p1")
			.enqueue(put("a", "created", "p2"));
		expect(sending.operations.map((operation) => operation.opId)).toEqual(["p1", "p2"]);
		expect(outbox.discardSettings("a").operations.map((operation) => operation.opId)).toEqual([
			"p2",
		]);
	});

	it("clears every sending mark", () => {
		const outbox = build(createTask("1"), createTask("2")).markSending("op-1").markSending("op-2");
		expect(outbox.operations.every((operation) => operation.sending)).toBe(true);
		expect(outbox.clearSending().operations.some((operation) => operation.sending)).toBe(false);
	});

	it("discards operations for the given tasks only", () => {
		const outbox = build(
			createTask("1"),
			updateTask("2", {}),
			deleteTask("3"),
			createList("l"),
		).discardTasks(new Set(["1", "3"]));
		expect(outbox.operations.map((operation) => operation.opId)).toEqual(["u-2", "cl-l"]);
	});

	it("removes an operation by id", () => {
		expect(build(createTask("1"), createTask("2")).remove("op-1").operations).toHaveLength(1);
	});

	it("reports pending and deleted ids", () => {
		const outbox = build(
			createTask("1"),
			updateTask("2", {}),
			deleteTask("3"),
			createList("a"),
			renameList("b", "x"),
			deleteList("c"),
		);
		expect([...outbox.pendingTaskIds()].sort()).toEqual(["1", "2", "3"]);
		expect([...outbox.pendingListIds()].sort()).toEqual(["a", "b", "c"]);
	});
});
