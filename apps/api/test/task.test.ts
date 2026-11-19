import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";

const now = new Date("2026-01-01T00:00:00Z");

describe("Task", () => {
	it("creates with defaults and trims the title", () => {
		const task = Task.create("1", "  Buy milk  ", now);
		expect(task.id).toBe("1");
		expect(task.title).toBe("Buy milk");
		expect(task.completed).toBe(false);
		expect(task.importance).toBe("normal");
		expect(task.dueDate).toBeNull();
		expect(task.createdAt).toBe(now);
	});

	it("rejects an empty title", () => {
		expect(() => Task.create("1", "   ", now)).toThrow("Task title must not be empty");
	});

	it("is immutable across transitions", () => {
		const original = Task.create("1", "A", now);
		const due = new Date("2026-02-01T00:00:00Z");
		const changed = original.rename("B").complete().setImportance("high").setDueDate(due);
		expect(original.title).toBe("A");
		expect(original.completed).toBe(false);
		expect(changed.title).toBe("B");
		expect(changed.completed).toBe(true);
		expect(changed.importance).toBe("high");
		expect(changed.dueDate).toBe(due);
		expect(changed.reopen().completed).toBe(false);
	});

	it("rejects renaming to an empty title", () => {
		expect(() => Task.create("1", "A", now).rename(" ")).toThrow();
	});
});
