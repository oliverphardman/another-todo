import { describe, expect, it, vi } from "vitest";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { LocalDatabase } from "../src/storage/local-database";
import { TodoStore } from "../src/state/todo-store";
import { FixedClock, RecordingSoundPlayer, SequenceIds, taskData } from "./support/fakes";

async function setup() {
	const database = new LocalDatabase(new MemoryKeyValueStore());
	const trigger = { request: vi.fn() };
	const clock = new FixedClock();
	const sounds = new RecordingSoundPlayer();
	const store = new TodoStore(database, new SequenceIds(), clock, trigger, sounds);
	return { database, trigger, store, clock, sounds };
}

describe("TodoStore", () => {
	it("starts on My Day with nothing selected", async () => {
		const { store } = await setup();
		expect(store.selectedView.id).toBe("my-day");
		expect(store.selectedTask).toBeNull();
		expect(store.today).toBe("2026-11-19");
	});

	it("adds trimmed tasks, queues a create and requests a sync", async () => {
		const { store, trigger, database } = await setup();
		expect(store.addTask("   ")).toBeNull();
		const id = store.addTask("  Buy milk ");
		expect(id).toBe("id-1");
		expect(store.get().tasks.map((task) => task.title)).toEqual(["Buy milk"]);
		expect(database.get().outbox.map((operation) => operation.kind)).toEqual(["createTask"]);
		expect(store.get().pendingChanges).toBe(1);
		expect(trigger.request).toHaveBeenCalledTimes(1);
	});

	it("applies the selected view's defaults to new tasks", async () => {
		const { store } = await setup();
		store.select("important");
		const important = store.addTask("Star");
		store.select("planned");
		const planned = store.addTask("Soon");
		const listId = store.addList("Work")!;
		const inList = store.addTask("In list");
		const byId = (id: string | null) => store.get().tasks.find((task) => task.id === id)!;
		expect(byId(important).important).toBe(true);
		expect(byId(planned).dueDay).toBe("2026-11-19");
		expect(byId(inList).listId).toBe(listId);
	});

	it("toggles completion and importance", async () => {
		const { store } = await setup();
		const id = store.addTask("A")!;
		store.toggleCompleted(id);
		store.toggleImportant(id);
		expect(store.get().tasks[0]!.completed).toBe(true);
		expect(store.get().tasks[0]!.important).toBe(true);
		store.toggleCompleted(id);
		store.toggleImportant(id);
		expect(store.get().tasks[0]!.completed).toBe(false);
		expect(store.get().tasks[0]!.important).toBe(false);
		store.toggleCompleted("missing");
		store.toggleImportant("missing");
	});

	it("plays the completion sound only when a task becomes completed", async () => {
		const { store, sounds } = await setup();
		const id = store.addTask("A")!;
		store.toggleCompleted(id);
		expect(sounds.plays).toBe(1);
		store.toggleCompleted(id);
		expect(sounds.plays).toBe(1);
		store.toggleImportant(id);
		store.renameTask(id, "B");
		store.toggleCompleted("missing");
		expect(sounds.plays).toBe(1);
		store.toggleCompleted(id);
		expect(sounds.plays).toBe(2);
	});

	it("adds to and removes tasks from My Day, which resets each day", async () => {
		const { store, clock, database } = await setup();
		store.select("tasks");
		const id = store.addTask("Plan")!;
		expect(store.visibleTasks().open).toHaveLength(1);
		store.select("my-day");
		expect(store.visibleTasks().open).toHaveLength(0);
		store.toggleMyDay(id);
		expect(store.visibleTasks().open.map((task) => task.id)).toEqual([id]);
		expect(store.taskCount(store.selectedView)).toBe(1);
		clock.advance(86_400_000);
		expect(store.visibleTasks().open).toHaveLength(1);
		store.refreshToday();
		expect(store.today).toBe("2026-11-20");
		expect(store.visibleTasks().open).toHaveLength(0);
		store.toggleMyDay(id);
		expect(store.visibleTasks().open).toHaveLength(1);
		store.toggleMyDay(id);
		expect(store.visibleTasks().open).toHaveLength(0);
		store.toggleMyDay("missing");
		expect(database.get().outbox.at(-1)).toMatchObject({
			kind: "createTask",
			task: { myDay: null },
		});
	});

	it("adds tasks due today to My Day automatically, until the user removes them", async () => {
		const { store, clock } = await setup();
		store.select("tasks");
		const id = store.addTask("Due today")!;
		store.select("my-day");
		expect(store.visibleTasks().open).toHaveLength(0);
		store.setDueDay(id, "2026-11-19");
		expect(store.visibleTasks().open.map((task) => task.id)).toEqual([id]);
		expect(store.taskCount(store.selectedView)).toBe(1);
		store.toggleMyDay(id);
		expect(store.visibleTasks().open).toHaveLength(0);
		expect(store.get().tasks[0]).toMatchObject({
			data: { myDay: null, myDayDismissed: "2026-11-19" },
		});
		store.setDueDay(id, "2026-11-20");
		store.setDueDay(id, "2026-11-19");
		expect(store.visibleTasks().open).toHaveLength(0);
		store.toggleMyDay(id);
		expect(store.visibleTasks().open).toHaveLength(1);
		expect(store.get().tasks[0]).toMatchObject({
			data: { myDay: "2026-11-19", myDayDismissed: null },
		});
		clock.advance(86_400_000);
		store.refreshToday();
		expect(store.visibleTasks().open).toHaveLength(0);
		store.setDueDay(id, "2026-11-20");
		expect(store.visibleTasks().open).toHaveLength(1);
	});

	it("brings back a dismissed due task on a later due day, not the same day", async () => {
		const { store } = await setup();
		store.select("tasks");
		const id = store.addTask("Recurring")!;
		store.setDueDay(id, "2026-11-19");
		store.toggleMyDay(id);
		store.setDueDay(id, "2026-11-25");
		expect(store.get().tasks[0]!.isInMyDay("2026-11-25")).toBe(true);
	});

	it("only notifies when the day actually changes", async () => {
		const { store, clock } = await setup();
		const listener = vi.fn();
		store.subscribe(listener);
		store.refreshToday();
		expect(listener).not.toHaveBeenCalled();
		clock.advance(86_400_000);
		store.refreshToday();
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("puts tasks added in My Day into My Day", async () => {
		const { store } = await setup();
		const id = store.addTask("Today thing")!;
		expect(
			store
				.get()
				.tasks.find((task) => task.id === id)!
				.isInMyDay("2026-11-19"),
		).toBe(true);
		expect(store.visibleTasks().open).toHaveLength(1);
	});

	it("renames, sets due days and moves tasks", async () => {
		const { store } = await setup();
		const id = store.addTask("A")!;
		store.renameTask(id, "  B ");
		store.renameTask(id, "   ");
		store.setDueDay(id, "2026-12-01");
		expect(store.get().tasks[0]!.dueDay).toBe("2026-12-01");
		store.setDueDay(id, null);
		expect(store.get().tasks[0]!.dueDay).toBeNull();
		store.moveTask(id, "l1");
		expect(store.get().tasks[0]!.listId).toBe("l1");
		expect(store.get().tasks[0]!.title).toBe("B");
		store.updateTask("missing", { title: "x" });
		expect(store.get().tasks).toHaveLength(1);
	});

	it("deletes tasks and clears the selection", async () => {
		const { store } = await setup();
		const id = store.addTask("A")!;
		store.selectTask(id);
		expect(store.selectedTask?.id).toBe(id);
		store.deleteTask(id);
		expect(store.get().tasks).toEqual([]);
		expect(store.selectedTask).toBeNull();
		store.selectTask("ghost");
		expect(store.get().selectedTaskId).toBe("ghost");
	});

	it("manages lists", async () => {
		const { store } = await setup();
		expect(store.addList("  ")).toBeNull();
		const id = store.addList(" Work ")!;
		expect(store.selectedView.id).toBe(id);
		expect(store.selectedView.title).toBe("Work");
		store.renameList(id, "Home");
		store.renameList(id, " ");
		store.renameList("missing", "X");
		expect(store.selectedView.title).toBe("Home");
		store.deleteList("missing");
		store.deleteList(id);
		expect(store.get().lists).toEqual([]);
		expect(store.selectedView.id).toBe("my-day");
	});

	it("renames only the targeted list", async () => {
		const { store } = await setup();
		const first = store.addList("One")!;
		const second = store.addList("Two")!;
		store.renameList(first, "Uno");
		expect(store.get().lists.map((list) => list.name)).toEqual(["Uno", "Two"]);
		expect(store.get().lists.find((list) => list.id === second)!.name).toBe("Two");
	});

	it("deleting a list removes its tasks and their pending operations", async () => {
		const { store, database } = await setup();
		const listId = store.addList("Work")!;
		store.addTask("Inside");
		store.select("tasks");
		store.addTask("Outside");
		store.deleteList(listId);
		expect(store.get().tasks.map((task) => task.title)).toEqual(["Outside"]);
		expect(database.get().outbox.map((operation) => operation.kind)).toEqual(["createTask"]);
	});

	it("sorts open tasks newest first and completed tasks separately", async () => {
		const { store, database } = await setup();
		store.select("all");
		await database.apply((snapshot) => ({
			...snapshot,
			tasks: [
				taskData({ id: "old", createdAt: "2026-11-01T00:00:00.000Z" }),
				taskData({ id: "new", createdAt: "2026-11-10T00:00:00.000Z" }),
				taskData({ id: "tie-b", createdAt: "2026-11-05T00:00:00.000Z" }),
				taskData({ id: "tie-a", createdAt: "2026-11-05T00:00:00.000Z" }),
				taskData({ id: "done", completed: true }),
			],
		}));
		const { open, done } = store.visibleTasks();
		expect(open.map((task) => task.id)).toEqual(["new", "tie-a", "tie-b", "old"]);
		expect(done.map((task) => task.id)).toEqual(["done"]);
	});

	it("orders the planned view by due day", async () => {
		const { store, database } = await setup();
		await database.apply((snapshot) => ({
			...snapshot,
			tasks: [
				taskData({ id: "late", dueDate: "2026-12-05T00:00:00.000Z" }),
				taskData({ id: "soon", dueDate: "2026-11-20T00:00:00.000Z" }),
				taskData({
					id: "soon2",
					dueDate: "2026-11-20T00:00:00.000Z",
					createdAt: "2026-11-18T00:00:00.000Z",
				}),
				taskData({ id: "none" }),
			],
		}));
		store.select("planned");
		expect(store.visibleTasks().open.map((task) => task.id)).toEqual(["soon", "soon2", "late"]);
	});

	it("reports list names and counts", async () => {
		const { store } = await setup();
		const listId = store.addList("Work")!;
		store.addTask("A");
		store.select("tasks");
		store.addTask("B");
		const inWork = store.get().tasks.find((task) => task.listId === listId)!;
		const loose = store.get().tasks.find((task) => task.listId === null)!;
		expect(store.listName(inWork)).toBe("Work");
		expect(store.listName(loose)).toBe("Tasks");
		store.toggleCompleted(loose.id);
		const all = store.get().views.find((view) => view.id === "all")!;
		expect(store.taskCount(all)).toBe(1);
	});

	it("follows changes made to the database directly", async () => {
		const { store, database } = await setup();
		store.select("ghost");
		expect(store.selectedView.id).toBe("my-day");
		store.select("important");
		expect(store.selectedView.id).toBe("important");
		await database.apply((snapshot) => ({ ...snapshot, tasks: [taskData({ id: "x" })] }));
		expect(store.get().tasks).toHaveLength(1);
	});
});
