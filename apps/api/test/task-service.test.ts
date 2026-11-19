import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../src/domain/errors";
import { FixedClock, createService } from "./support/fixtures";

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
});
