import { describe, expect, it } from "vitest";
import { InMemoryTaskRepository } from "../src/domain/in-memory-task-repository";
import { Task } from "../src/domain/task";

const now = new Date("2026-01-01T00:00:00Z");

describe("InMemoryTaskRepository", () => {
	it("saves, finds, lists and deletes", async () => {
		const repo = new InMemoryTaskRepository();
		const task = Task.create("1", "A", now);
		await repo.save(task);
		expect(await repo.findById("1")).toBe(task);
		expect(await repo.list()).toEqual([task]);
		await repo.delete("1");
		expect(await repo.findById("1")).toBeNull();
		expect(await repo.list()).toEqual([]);
	});
});
