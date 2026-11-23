import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../src/domain/errors";
import { FixedClock, createService, createServices } from "./support/fixtures";

describe("TaskService", () => {
	it("creates tasks with optional fields", async () => {
		const service = createService();
		const task = await service.create("u", {
			title: " Plan ",
			completed: true,
			importance: "high",
			dueDate: "2026-03-01T00:00:00Z",
		});
		expect(task.title).toBe("Plan");
		expect(task.completed).toBe(true);
		expect(task.importance).toBe("high");
		expect(task.dueDate?.toISOString()).toBe("2026-03-01T00:00:00.000Z");
	});

	it("requires a string title", async () => {
		const service = createService();
		await expect(service.create("u", {})).rejects.toThrow("title is required");
		await expect(service.create("u", { title: 3 })).rejects.toThrow("title must be a string");
	});

	it("validates optional fields", async () => {
		const service = createService();
		const task = await service.create("u", { title: "A" });
		await expect(service.update("u", task.id, { completed: "yes" })).rejects.toThrow(
			ValidationError,
		);
		await expect(service.update("u", task.id, { importance: "low" })).rejects.toThrow(
			ValidationError,
		);
		await expect(service.update("u", task.id, { dueDate: "nope" })).rejects.toThrow(
			ValidationError,
		);
		await expect(service.update("u", task.id, { dueDate: 5 })).rejects.toThrow(ValidationError);
	});

	it("sets, validates and clears a reminder", async () => {
		const service = createService();
		const task = await service.create("u", { title: "A", remindAt: "2026-03-01T09:30:00Z" });
		expect(task.remindAt?.toISOString()).toBe("2026-03-01T09:30:00.000Z");
		expect(task.toJSON().remindAt).toBe("2026-03-01T09:30:00.000Z");
		await expect(service.update("u", task.id, { remindAt: "nope" })).rejects.toThrow(
			"remindAt must be an ISO 8601 date string or null",
		);
		expect((await service.update("u", task.id, { remindAt: null })).remindAt).toBeNull();
	});

	it("gets, updates and clears fields", async () => {
		const service = createService();
		const task = await service.create("u", { title: "A", dueDate: "2026-03-01T00:00:00Z" });
		const updated = await service.update("u", task.id, {
			title: "B",
			completed: true,
			dueDate: null,
		});
		expect(updated.title).toBe("B");
		expect(updated.completed).toBe(true);
		expect(updated.dueDate).toBeNull();
		expect((await service.update("u", task.id, { completed: false })).completed).toBe(false);
		expect((await service.get("u", task.id)).title).toBe("B");
	});

	it("scopes tasks to their owner", async () => {
		const service = createService();
		const task = await service.create("u", { title: "A" });
		await expect(service.get("other", task.id)).rejects.toThrow(NotFoundError);
		await expect(service.update("other", task.id, {})).rejects.toThrow(NotFoundError);
		await expect(service.delete("other", task.id)).rejects.toThrow(NotFoundError);
	});

	it("assigns tasks to existing lists and filters by list", async () => {
		const { tasks, lists } = createServices();
		const list = await lists.create("u", { name: "Work" });
		const inList = await tasks.create("u", { title: "A", listId: list.id });
		const loose = await tasks.create("u", { title: "B", listId: null });
		expect(inList.listId).toBe(list.id);
		expect(loose.listId).toBeNull();
		expect((await tasks.list("u", list.id)).map((task) => task.id)).toEqual([inList.id]);
		expect(await tasks.list("u")).toHaveLength(2);
		const moved = await tasks.update("u", loose.id, { listId: list.id });
		expect(moved.listId).toBe(list.id);
		expect((await tasks.update("u", loose.id, { listId: null })).listId).toBeNull();
	});

	it("rejects unknown or malformed lists", async () => {
		const { tasks } = createServices();
		await expect(tasks.create("u", { title: "A", listId: "nope" })).rejects.toThrow(
			"List nope does not exist",
		);
		await expect(tasks.create("u", { title: "A", listId: "" })).rejects.toThrow(ValidationError);
		const task = await tasks.create("u", { title: "A" });
		await expect(tasks.update("u", task.id, { listId: 7 })).rejects.toThrow(ValidationError);
	});

	it("creates idempotently when the client supplies an id", async () => {
		const { tasks } = createServices();
		const first = await tasks.create("u", { id: "client-1", title: "A" });
		const second = await tasks.create("u", { id: "client-1", title: "Changed" });
		expect(first.id).toBe("client-1");
		expect(second).toBe(first);
		expect((await tasks.list("u")).length).toBe(1);
		expect((await tasks.create("other", { id: "client-1", title: "B" })).title).toBe("B");
	});

	it("rejects malformed client ids", async () => {
		const { tasks } = createServices();
		for (const id of ["", "has space", "x".repeat(65), 5]) {
			await expect(tasks.create("u", { id, title: "A" })).rejects.toThrow(ValidationError);
		}
	});

	it("sets and clears My Day and rejects malformed days", async () => {
		const { tasks } = createServices();
		const task = await tasks.create("u", { title: "A", myDay: "2026-11-19" });
		expect(task.myDay).toBe("2026-11-19");
		expect((await tasks.update("u", task.id, { myDay: null })).myDay).toBeNull();
		for (const myDay of ["2026-02-30", "19/11/2026", "", 5, "2026-11-19T00:00:00Z"]) {
			await expect(tasks.update("u", task.id, { myDay })).rejects.toThrow(ValidationError);
		}
	});

	it("records the day a task was removed from My Day and validates it", async () => {
		const { tasks } = createServices();
		const task = await tasks.create("u", { title: "A", myDayDismissed: "2026-11-19" });
		expect(task.myDayDismissed).toBe("2026-11-19");
		expect((await tasks.update("u", task.id, { myDayDismissed: null })).myDayDismissed).toBeNull();
		await expect(tasks.update("u", task.id, { myDayDismissed: "soon" })).rejects.toThrow(
			"myDayDismissed must be a YYYY-MM-DD date or null",
		);
	});

	it("stores steps and notes and validates them", async () => {
		const { tasks } = createServices();
		const steps = [
			{ id: "a", title: " First ", completed: false },
			{ id: "b", title: "Second", completed: true },
		];
		const task = await tasks.create("u", { title: "A", steps, note: "Details" });
		expect(task.steps).toEqual([
			{ id: "a", title: "First", completed: false },
			{ id: "b", title: "Second", completed: true },
		]);
		expect(task.note).toBe("Details");
		expect((await tasks.update("u", task.id, { steps: [] })).steps).toEqual([]);
		const invalid: unknown[] = [
			"nope",
			Array.from({ length: 101 }, (_, i) => ({ id: `s${i}`, title: "x", completed: false })),
			[null],
			[{ id: "a", title: "", completed: false }],
			[{ id: "a", title: "   ", completed: false }],
			[{ id: "a", title: "x".repeat(257), completed: false }],
			[{ id: "a", title: "x", completed: "no" }],
			[{ id: "bad id", title: "x", completed: false }],
		];
		for (const value of invalid) {
			await expect(tasks.update("u", task.id, { steps: value })).rejects.toThrow(ValidationError);
		}
		await expect(tasks.update("u", task.id, { note: 5 })).rejects.toThrow(ValidationError);
		await expect(tasks.update("u", task.id, { note: "x".repeat(10001) })).rejects.toThrow(
			ValidationError,
		);
	});

	it("deletes tasks", async () => {
		const service = createService();
		const task = await service.create("u", { title: "A" });
		await service.delete("u", task.id);
		await expect(service.get("u", task.id)).rejects.toThrow(NotFoundError);
	});

	it("lists by creation time then id", async () => {
		const clock = new FixedClock();
		const service = createService(clock);
		const first = await service.create("u", { title: "first" });
		const second = await service.create("u", { title: "second" });
		clock.advance(1000);
		const third = await service.create("u", { title: "third" });
		const ids = (await service.list("u")).map((task) => task.id);
		expect(ids).toEqual([first.id, second.id, third.id]);
		expect((await service.list("u")).length).toBe(3);
	});

	it("rejects a position that is not a finite number", async () => {
		const tasks = createService();
		const task = await tasks.create("u", { title: "A" });
		await expect(
			tasks.update("u", task.id, { position: Number.POSITIVE_INFINITY }),
		).rejects.toThrow("position must be a number or null");
		await expect(tasks.update("u", task.id, { position: "x" })).rejects.toThrow(
			"position must be a number or null",
		);
	});
});
