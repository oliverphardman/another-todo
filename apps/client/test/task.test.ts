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
		expect(changed.dueSortKey).toBe("2026-11-20T00:00:00.000Z");
		expect(changed.with({ dueDate: null }).dueSortKey).toBe("9999-12-31");
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
