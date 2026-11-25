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

	it("sets a repeat with a due date to match, and drops it with the date", async () => {
		const { store } = await setup();
		const id = store.addTask("A")!;
		const task = () => store.get().tasks[0]!;
		store.setRepeat(id, { frequency: "weekly", weekdays: [1] });
		expect(task().dueDay).toBe("2026-11-23");
		store.setRepeat(id, { frequency: "monthly" });
		expect(task().repeat).toEqual({ frequency: "monthly", monthDay: 23 });
		store.setDueDay(id, "2026-12-05");
		expect(task().repeat).toEqual({ frequency: "monthly", monthDay: 5 });
		store.setDueDay(id, null);
		expect(task().repeat).toBeNull();
		store.setRepeat(id, { frequency: "daily" });
		store.setRepeat(id, null);
		expect(task().repeat).toBeNull();
		expect(task().dueDay).toBe("2026-11-19");
		store.setRepeat("missing", null);
	});

	it("creates the next task once, however the completion arrives", async () => {
		const { store } = await setup();
		const id = store.addTask("A")!;
		store.setRepeat(id, { frequency: "daily" });
		store.completeTasks([id], true);
		store.toggleCompleted(id);
		store.toggleCompleted(id);
		expect(store.get().tasks.map((task) => task.id)).toEqual([id, `${id}-r20261120`]);
	});

	it("rolls a repeating task completed elsewhere once it arrives", async () => {
		const { store, database } = await setup();
		await database.apply((snapshot) => ({
			...snapshot,
			tasks: [
				taskData({
					id: "remote",
					completed: true,
					dueDate: "2026-11-19T00:00:00.000Z",
					repeat: { frequency: "daily" },
				}),
			],
		}));
		await Promise.resolve();
		expect(store.get().tasks.map((task) => [task.id, task.repeat !== null])).toEqual([
			["remote", false],
			["remote-r20261120", true],
		]);
		expect(database.get().outbox.map((operation) => operation.kind)).toEqual([
			"createTask",
			"updateTask",
		]);
	});

	it("does not create a next task that another device already made", async () => {
		const { store, database } = await setup();
		await database.apply((snapshot) => ({
			...snapshot,
			tasks: [
				taskData({
					id: "remote",
					completed: true,
					dueDate: "2026-11-19T00:00:00.000Z",
					repeat: { frequency: "daily" },
				}),
				taskData({ id: "remote-r20261120" }),
			],
		}));
		await Promise.resolve();
		expect(store.get().tasks).toHaveLength(2);
		expect(database.get().outbox.map((operation) => operation.kind)).toEqual(["updateTask"]);
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

	it("manages steps and notes", async () => {
		const { store } = await setup();
		const id = store.addTask("Parent")!;
		store.addStep(id, "  First ");
		store.addStep(id, "   ");
		store.addStep("missing", "Orphan");
		const first = store.get().tasks[0]!.steps[0]!;
		expect(first).toMatchObject({ title: "First", completed: false });
		store.addStep(id, "Second");
		store.updateStep(id, first.id, { completed: true });
		store.updateStep(id, first.id, { title: "  Renamed " });
		store.updateStep(id, first.id, { title: "   " });
		store.updateStep("missing", first.id, { completed: true });
		expect(store.get().tasks[0]!.steps.map((step) => [step.title, step.completed])).toEqual([
			["Renamed", true],
			["Second", false],
		]);
		expect(store.get().tasks[0]!.stepsCompleted).toBe(1);
		store.deleteStep(id, first.id);
		store.deleteStep("missing", first.id);
		expect(store.get().tasks[0]!.steps.map((step) => step.title)).toEqual(["Second"]);
		store.setNote(id, "A note");
		store.setNote(id, "A note");
		store.setNote("missing", "x");
		expect(store.get().tasks[0]!.note).toBe("A note");
	});

	it("keeps settings per view, queues them for syncing and applies sort and hide completed", async () => {
		const { store, database } = await setup();
		store.select("tasks");
		const first = store.addTask("Banana")!;
		store.addTask("apple");
		const third = store.addTask("Cherry")!;
		store.toggleCompleted(third);
		store.updateSettings("tasks", { sort: "alphabetical" });
		expect(store.settingsFor("tasks").sort).toBe("alphabetical");
		expect(store.settingsFor("my-day").sort).toBeNull();
		expect(store.visibleTasks().open.map((task) => task.title)).toEqual(["apple", "Banana"]);
		expect(store.visibleTasks().done.map((task) => task.title)).toEqual(["Cherry"]);
		store.updateSettings("tasks", { hideCompleted: true });
		expect(store.visibleTasks().done).toEqual([]);
		store.updateSettings("tasks", { theme: { type: "color", color: "#3a8a4a" } });
		expect(store.settingsFor("tasks").data).toEqual({
			id: "tasks",
			sort: "alphabetical",
			hideCompleted: true,
			theme: { type: "color", color: "#3a8a4a" },
		});
		expect(
			database.get().outbox.filter((operation) => operation.kind === "putSettings"),
		).toHaveLength(1);
		store.toggleImportant(first);
		store.updateSettings("tasks", { sort: "importance" });
		expect(store.visibleTasks().open[0]!.id).toBe(first);
	});

	it("duplicates a list with its tasks, steps and notes", async () => {
		const { store } = await setup();
		expect(store.duplicateList("missing", "Copy")).toBeNull();
		const listId = store.addList("Groceries")!;
		const task = store.addTask("Milk")!;
		store.addStep(task, "Check the date");
		store.setNote(task, "Semi-skimmed");
		store.setDueDay(task, "2026-11-25");
		store.toggleCompleted(task);
		store.select("tasks");
		store.addTask("Elsewhere");
		const copyId = store.duplicateList(listId, "Copy of Groceries")!;
		expect(store.selectedView.id).toBe(copyId);
		expect(store.selectedView.title).toBe("Copy of Groceries");
		const copies = store.get().tasks.filter((entry) => entry.listId === copyId);
		expect(copies).toHaveLength(1);
		const original = store.get().tasks.find((entry) => entry.id === task)!;
		expect(copies[0]!.id).not.toBe(task);
		expect(copies[0]).toMatchObject({
			data: { title: "Milk", note: "Semi-skimmed", completed: true },
		});
		expect(copies[0]!.steps[0]!.id).not.toBe(original.steps[0]!.id);
		expect(copies[0]!.steps[0]!.title).toBe("Check the date");
		expect(store.get().tasks.filter((entry) => entry.listId === listId)).toHaveLength(1);
		expect(store.get().tasks.filter((entry) => entry.listId === null)).toHaveLength(1);
	});

	it("forgets a deleted list's settings, including ones not yet synced", async () => {
		const { store, database } = await setup();
		const listId = store.addList("Temp")!;
		store.updateSettings(listId, { sort: "due" });
		store.deleteList(listId);
		expect(store.get().settings).toEqual([]);
		expect(database.get().outbox).toEqual([]);
	});

	it("selects one task, toggles tasks in and out of a selection and clears it", async () => {
		const { store } = await setup();
		store.select("all");
		const ids = ["A", "B", "C"].map((title) => store.addTask(title)!);
		store.selectTask(ids[0]!);
		expect(store.get().selectedTaskIds).toEqual([ids[0]]);
		expect(store.get().selectedTaskId).toBe(ids[0]);
		store.toggleTaskSelection(ids[2]!);
		expect(store.get().selectedTaskIds).toEqual([ids[0], ids[2]]);
		expect(store.get().selectedTaskId).toBeNull();
		expect(store.selectedTasks.map((task) => task.title).sort()).toEqual(["A", "C"]);
		expect(store.selectedTask).toBeNull();
		store.toggleTaskSelection(ids[0]!);
		expect(store.get().selectedTaskId).toBe(ids[2]);
		store.selectTask(null);
		expect(store.get().selectedTaskIds).toEqual([]);
		store.selectTask(ids[1]!);
		store.select("my-day");
		expect(store.get().selectedTaskIds).toEqual([]);
	});

	it("selects a range in the order the tasks are shown", async () => {
		const { store, clock } = await setup();
		store.select("all");
		const ids = ["A", "B", "C", "D"].map((title) => {
			clock.advance(1000);
			return store.addTask(title)!;
		});
		const shown = store.visibleTasks().open.map((task) => task.id);
		expect(shown).toEqual([ids[3], ids[2], ids[1], ids[0]]);
		store.selectTask(ids[2]!);
		store.selectTaskRange(ids[0]!);
		expect(store.get().selectedTaskIds).toEqual([ids[2], ids[1], ids[0]]);
		store.selectTaskRange(ids[3]!);
		expect(store.get().selectedTaskIds).toEqual([ids[3], ids[2]]);
		expect(store.get().anchorTaskId).toBe(ids[2]);
	});

	it("starts a range from the clicked task when nothing is selected, and ignores unknown tasks", async () => {
		const { store } = await setup();
		store.select("all");
		const id = store.addTask("Only")!;
		store.selectTaskRange(id);
		expect(store.get().selectedTaskIds).toEqual([id]);
		store.selectTaskRange("ghost");
		expect(store.get().selectedTaskIds).toEqual(["ghost"]);
	});

	it("forgets selected tasks that no longer exist", async () => {
		const { store } = await setup();
		store.select("all");
		const a = store.addTask("A")!;
		const b = store.addTask("B")!;
		store.selectTask(a);
		store.toggleTaskSelection(b);
		store.deleteTask(a);
		expect(store.get().selectedTaskIds).toEqual([b]);
		expect(store.get().selectedTaskId).toBe(b);
		store.deleteTask(b);
		expect(store.get().anchorTaskId).toBeNull();
	});

	it("changes many tasks at once", async () => {
		const { store, sounds } = await setup();
		store.select("tasks");
		const ids = ["A", "B", "C"].map((title) => store.addTask(title)!);
		const two = [ids[0]!, ids[1]!];
		store.completeTasks(two, true);
		expect(sounds.plays).toBe(1);
		expect(store.get().tasks.filter((task) => task.completed)).toHaveLength(2);
		store.completeTasks(two, true);
		expect(sounds.plays).toBe(1);
		store.completeTasks(two, false);
		expect(store.get().tasks.some((task) => task.completed)).toBe(false);
		store.setImportant(two, true);
		expect(store.get().tasks.filter((task) => task.important)).toHaveLength(2);
		store.setImportant(two, false);
		store.setInMyDay(two, true);
		expect(store.get().tasks.filter((task) => task.isInMyDay(store.today))).toHaveLength(2);
		store.setInMyDay(two, true);
		store.setInMyDay(two, false);
		expect(store.get().tasks.some((task) => task.isInMyDay(store.today))).toBe(false);
		store.setDueDayFor(two, "2026-11-25");
		expect(store.get().tasks.filter((task) => task.dueDay === "2026-11-25")).toHaveLength(2);
		store.setDueDayFor(two, null);
		const listId = store.addList("Target")!;
		store.moveTasks(two, listId);
		store.moveTasks(two, listId);
		expect(store.get().tasks.filter((task) => task.listId === listId)).toHaveLength(2);
		store.moveTasks(two, null);
		expect(store.get().tasks.filter((task) => task.listId === null)).toHaveLength(3);
		store.deleteTasks(two);
		expect(store.get().tasks.map((task) => task.title)).toEqual(["C"]);
		store.deleteTasks(["ghost"]);
	});

	it("turns a task into a list whose tasks are its steps", async () => {
		const { store } = await setup();
		store.select("tasks");
		const id = store.addTask("Plan trip")!;
		store.addStep(id, "Book flights");
		store.addStep(id, "Pack");
		const first = store.get().tasks[0]!.steps[0]!;
		store.updateStep(id, first.id, { completed: true });
		const listId = store.createListFromTask(id)!;
		expect(store.selectedView.id).toBe(listId);
		expect(store.selectedView.title).toBe("Plan trip");
		expect(store.get().tasks.map((task) => [task.title, task.completed, task.listId])).toEqual([
			["Book flights", true, listId],
			["Pack", false, listId],
		]);
		expect(store.createListFromTask("ghost")).toBeNull();
	});

	it("orders lists by position and reorders by dragging", async () => {
		const { store, database, clock } = await setup();
		const ids = ["A", "B", "C"].map((name) => {
			clock.advance(1000);
			return store.addList(name)!;
		});
		const names = () => store.orderedLists().map((list) => list.name);
		expect(names()).toEqual(["A", "B", "C"]);
		store.moveList(ids[2]!, 0);
		expect(names()).toEqual(["C", "A", "B"]);
		store.moveList(ids[0]!, 2);
		expect(names()).toEqual(["C", "B", "A"]);
		store.moveList(ids[0]!, 99);
		expect(names()).toEqual(["C", "B", "A"]);
		store.moveList(ids[1]!, 1);
		expect(names()).toEqual(["C", "B", "A"]);
		store.moveList("ghost", 0);
		expect(
			store
				.get()
				.views.filter((view) => view.isCustomList)
				.map((view) => view.title),
		).toEqual(["C", "B", "A"]);
		const moves = database.get().outbox.filter((operation) => operation.kind === "moveList");
		expect(moves).toHaveLength(2);
		store.shiftList(ids[0]!, -1);
		expect(names()).toEqual(["C", "A", "B"]);
		store.shiftList(ids[0]!, 1);
		expect(names()).toEqual(["C", "B", "A"]);
		store.shiftList("ghost", 1);
		const single = await setup();
		const only = single.store.addList("Only")!;
		single.store.moveList(only, 0);
		expect(single.database.get().outbox.some((operation) => operation.kind === "moveList")).toBe(
			false,
		);
	});

	it("positions a list at either end or between neighbors", async () => {
		const { store, clock } = await setup();
		const [a, b] = ["A", "B"].map((name) => {
			clock.advance(1000);
			return store.addList(name)!;
		});
		const position = (id: string) => store.get().lists.find((list) => list.id === id)!.position;
		store.moveList(a!, 1);
		expect(position(a!)).toBe(position(b!) + 1000);
		store.moveList(a!, 0);
		expect(position(a!)).toBe(position(b!) - 1000);
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
		expect(store.listName(loose)).toBeNull();
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

describe("TodoStore groups", () => {
	it("creates groups, assigns lists, renames and ungroups on delete", async () => {
		const { store, database } = await setup();
		expect(store.addGroup("  ")).toBeNull();
		const list = store.addList("Chores")!;
		const other = store.addList("Garden")!;
		const group = store.createGroupFor(list, "New group")!;
		expect(store.get().groups.map((entry) => entry.name)).toEqual(["New group"]);
		expect(store.get().renamingGroupId).toBe(group);
		expect(store.get().lists.find((entry) => entry.id === list)!.groupId).toBe(group);
		store.stopRenamingGroup();
		expect(store.get().renamingGroupId).toBeNull();
		store.renameGroup(group, "  House ");
		expect(store.get().groups[0]!.name).toBe("House");
		store.renameGroup(group, "  ");
		store.renameGroup("ghost", "X");
		expect(store.get().groups[0]!.name).toBe("House");
		store.setListGroup(other, group);
		store.setListGroup(other, group);
		store.setListGroup("ghost", group);
		store.setListGroup(other, "ghost");
		expect(store.get().lists.filter((entry) => entry.groupId === group)).toHaveLength(2);
		store.setListGroup(other, null);
		expect(store.get().lists.find((entry) => entry.id === other)!.groupId).toBeNull();
		store.deleteGroup(group);
		store.deleteGroup(group);
		expect(store.get().groups).toEqual([]);
		expect(store.get().lists.every((entry) => entry.groupId === null)).toBe(true);
		expect(
			database
				.get()
				.outbox.some((operation) =>
					["createGroup", "renameGroup", "deleteGroup"].includes(operation.kind),
				),
		).toBe(false);
	});

	it("refuses to group a missing list or with a blank name and starts renaming only known groups", async () => {
		const { store } = await setup();
		const list = store.addList("A")!;
		expect(store.createGroupFor("ghost", "G")).toBeNull();
		expect(store.createGroupFor(list, " ")).toBeNull();
		store.startRenamingGroup("ghost");
		expect(store.get().renamingGroupId).toBeNull();
		const group = store.addGroup("G")!;
		store.startRenamingGroup(group);
		expect(store.get().renamingGroupId).toBe(group);
	});

	it("keeps reordering inside a group and sorts groups by position", async () => {
		const { store, clock } = await setup();
		const [a, b, c] = ["A", "B", "C"].map((name) => {
			clock.advance(1000);
			return store.addList(name)!;
		});
		clock.advance(1000);
		const group = store.addGroup("Second")!;
		clock.advance(-5000);
		const first = store.addGroup("First")!;
		expect(store.get().groups.map((entry) => entry.name)).toEqual(["First", "Second"]);
		store.setListGroup(b!, group);
		store.setListGroup(c!, group);
		store.moveList(c!, 0);
		const names = (id: string | null) =>
			store
				.orderedLists()
				.filter((list) => list.groupId === id)
				.map((list) => list.name);
		expect(names(group)).toEqual(["C", "B"]);
		expect(names(null)).toEqual(["A"]);
		store.shiftList(b!, -1);
		expect(names(group)).toEqual(["B", "C"]);
		expect(first).not.toBe(group);
		expect(a).toBeDefined();
	});

	it("breaks position ties by id and renames only the chosen group", async () => {
		const { store } = await setup();
		const first = store.addGroup("One")!;
		const second = store.addGroup("Two")!;
		expect(store.get().groups.map((entry) => entry.id)).toEqual([first, second]);
		store.renameGroup(second, "Deux");
		expect(store.get().groups.map((entry) => entry.name)).toEqual(["One", "Deux"]);
	});
});
