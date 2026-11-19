import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/domain/errors";
import { Task } from "../src/domain/task";

const now = new Date("2026-01-01T00:00:00Z");

describe("Task", () => {
	it("creates with defaults and trims the title", () => {
		const task = Task.create("u", "1", "  Buy milk  ", now);
		expect(task.ownerId).toBe("u");
		expect(task.id).toBe("1");
		expect(task.title).toBe("Buy milk");
		expect(task.completed).toBe(false);
		expect(task.importance).toBe("normal");
		expect(task.dueDate).toBeNull();
		expect(task.createdAt).toBe(now);
	});

	it("rejects an empty title", () => {
		expect(() => Task.create("u", "1", "   ", now)).toThrow(ValidationError);
	});

	it("is immutable across transitions", () => {
		const original = Task.create("u", "1", "A", now);
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
		expect(() => Task.create("u", "1", "A", now).rename(" ")).toThrow(ValidationError);
	});

	it("round-trips through records with and without a due date", () => {
		const plain = Task.create("u", "1", "A", now);
		expect(Task.restore(plain.toRecord()).toRecord()).toEqual(plain.toRecord());
		const due = plain.setDueDate(new Date("2026-02-01T00:00:00Z"));
		const restored = Task.restore(due.toRecord());
		expect(restored.dueDate?.toISOString()).toBe("2026-02-01T00:00:00.000Z");
		expect(restored.toRecord()).toEqual(due.toRecord());
	});

	it("moves between lists and restores legacy records without a list", () => {
		const task = Task.create("u", "1", "A", now).setList("l1");
		expect(task.listId).toBe("l1");
		expect(Task.restore(task.toRecord()).listId).toBe("l1");
		const { listId: _listId, ...legacy } = task.toRecord();
		expect(Task.restore(legacy).listId).toBeNull();
		expect(task.setList(null).listId).toBeNull();
	});

	it("tracks the day a task was added to My Day and restores legacy records without it", () => {
		const task = Task.create("u", "1", "A", now).setMyDay("2026-11-19");
		expect(task.myDay).toBe("2026-11-19");
		expect(Task.restore(task.toRecord()).myDay).toBe("2026-11-19");
		const { myDay: _myDay, ...legacy } = task.toRecord();
		expect(Task.restore(legacy).myDay).toBeNull();
		expect(task.setMyDay(null).myDay).toBeNull();
		const dismissed = task.setMyDayDismissed("2026-11-19");
		expect(dismissed.myDayDismissed).toBe("2026-11-19");
		expect(Task.restore(dismissed.toRecord()).myDayDismissed).toBe("2026-11-19");
		expect(Task.restore(legacy).myDayDismissed).toBeNull();
		expect(dismissed.setMyDayDismissed(null).myDayDismissed).toBeNull();
		expect(JSON.parse(JSON.stringify(task)).myDay).toBe("2026-11-19");
	});

	it("holds steps and a note and restores legacy records without them", () => {
		const steps = [{ id: "s1", title: "First", completed: false }];
		const task = Task.create("u", "1", "A", now).setSteps(steps).setNote("Remember the milk");
		expect(task.steps).toEqual(steps);
		expect(task.note).toBe("Remember the milk");
		expect(Task.restore(task.toRecord()).steps).toEqual(steps);
		expect(Task.restore(task.toRecord()).note).toBe("Remember the milk");
		const { steps: _steps, note: _note, ...legacy } = task.toRecord();
		expect(Task.restore(legacy).steps).toEqual([]);
		expect(Task.restore(legacy).note).toBe("");
	});

	it("serializes to JSON without the owner", () => {
		const json = JSON.parse(JSON.stringify(Task.create("u", "1", "A", now)));
		expect(json).toEqual({
			id: "1",
			title: "A",
			completed: false,
			importance: "normal",
			listId: null,
			myDay: null,
			myDayDismissed: null,
			steps: [],
			note: "",
			dueDate: null,
			createdAt: "2026-01-01T00:00:00.000Z",
		});
	});
});
