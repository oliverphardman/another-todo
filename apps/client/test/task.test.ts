import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { TodoList } from "../src/domain/todo-list";

describe("Task", () => {
	it("creates with defaults", () => {
		const task = Task.create("1", "Buy milk", "2026-11-19T10:00:00.000Z");
		expect(task.id).toBe("1");
		expect(task.title).toBe("Buy milk");
		expect(task.completed).toBe(false);
		expect(task.important).toBe(false);
		expect(task.listId).toBeNull();
		expect(task.dueDay).toBeNull();
		expect(task.createdAt).toBe("2026-11-19T10:00:00.000Z");
	});

	it("creates inside a list", () => {
		expect(Task.create("1", "A", "x", "list-1").listId).toBe("list-1");
	});

	it("applies changes immutably, including nulls", () => {
		const original = Task.create("1", "A", "x", "list-1");
		const changed = original.with({
			title: "B",
			completed: true,
			importance: "high",
			listId: null,
			dueDate: "2026-11-20T00:00:00.000Z",
		});
		expect(original.title).toBe("A");
		expect(changed.title).toBe("B");
		expect(changed.completed).toBe(true);
		expect(changed.important).toBe(true);
		expect(changed.listId).toBeNull();
		expect(changed.dueDay).toBe("2026-11-20");
		expect(changed.with({ dueDate: null }).dueDay).toBeNull();
		expect(changed.with({}).title).toBe("B");
		const inMyDay = changed.with({ myDay: "2026-11-19", dueDate: null });
		expect(inMyDay.isInMyDay("2026-11-19")).toBe(true);
		expect(inMyDay.isInMyDay("2026-11-20")).toBe(false);
		expect(inMyDay.with({ myDay: null }).isInMyDay("2026-11-19")).toBe(false);
		const due = Task.create("2", "Due", "x").with({ dueDate: "2026-11-19T00:00:00.000Z" });
		expect(due.isInMyDay("2026-11-19")).toBe(true);
		expect(due.isInMyDay("2026-11-20")).toBe(false);
		expect(due.with({ myDayDismissed: "2026-11-19" }).isInMyDay("2026-11-19")).toBe(false);
		expect(due.with({ myDayDismissed: "2026-11-18" }).isInMyDay("2026-11-19")).toBe(true);
		expect(
			due.with({ myDayDismissed: "2026-11-19", myDay: "2026-11-19" }).isInMyDay("2026-11-19"),
		).toBe(true);
		expect(changed.dueSortKey).toBe("2026-11-20T00:00:00.000Z");
		expect(changed.with({ dueDate: null }).dueSortKey).toBe("9999-12-31");
	});
});

describe("Task steps and notes", () => {
	it("defaults to no steps and an empty note, including for records saved before they existed", () => {
		const task = Task.create("1", "A", "x");
		expect(task.steps).toEqual([]);
		expect(task.note).toBe("");
		const { steps: _steps, note: _note, ...legacy } = task.data;
		const old = new Task(legacy as never);
		expect(old.steps).toEqual([]);
		expect(old.note).toBe("");
		expect(old.stepsCompleted).toBe(0);
	});

	it("applies steps and notes as changes", () => {
		const steps = [
			{ id: "a", title: "One", completed: true },
			{ id: "b", title: "Two", completed: false },
		];
		const task = Task.create("1", "A", "x").with({ steps, note: "Hello" });
		expect(task.steps).toEqual(steps);
		expect(task.note).toBe("Hello");
		expect(task.stepsCompleted).toBe(1);
		expect(task.with({ steps: [] }).steps).toEqual([]);
	});
});

describe("TodoList", () => {
	it("creates and renames immutably", () => {
		const list = TodoList.create("l1", "Work", "x");
		expect(list.id).toBe("l1");
		expect(list.name).toBe("Work");
		expect(list.rename("Home").name).toBe("Home");
		expect(list.name).toBe("Work");
	});
});
