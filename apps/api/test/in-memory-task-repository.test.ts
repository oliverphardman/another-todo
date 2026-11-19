import { describe, expect, it } from "vitest";
import { InMemoryTaskRepository } from "../src/domain/in-memory-task-repository";
import { Task } from "../src/domain/task";

const now = new Date("2026-01-01T00:00:00Z");

describe("InMemoryTaskRepository", () => {
	it("saves, finds, lists and deletes per owner", async () => {
		const repo = new InMemoryTaskRepository();
		const mine = Task.create("u1", "1", "A", now);
		const theirs = Task.create("u2", "1", "B", now);
		await repo.save(mine);
		await repo.save(theirs);
		expect(await repo.findById("u1", "1")).toBe(mine);
		expect(await repo.list("u1")).toEqual([mine]);
		await repo.delete("u1", "1");
		expect(await repo.findById("u1", "1")).toBeNull();
		expect(await repo.findById("u2", "1")).toBe(theirs);
	});
});
