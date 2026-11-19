import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/domain/errors";
import { InMemoryTodoListRepository } from "../src/domain/in-memory-todo-list-repository";
import { TodoList } from "../src/domain/todo-list";

const now = new Date("2026-01-01T00:00:00Z");

describe("TodoList", () => {
	it("creates, renames and trims names", () => {
		const list = TodoList.create("u", "1", "  Work ", now);
		expect(list.name).toBe("Work");
		expect(list.rename("Home").name).toBe("Home");
		expect(list.name).toBe("Work");
	});

	it("rejects empty names", () => {
		expect(() => TodoList.create("u", "1", " ", now)).toThrow(ValidationError);
		expect(() => TodoList.create("u", "1", "A", now).rename("")).toThrow(ValidationError);
	});

	it("round-trips records and serializes without the owner", () => {
		const list = TodoList.create("u", "1", "Work", now);
		expect(TodoList.restore(list.toRecord()).toRecord()).toEqual(list.toRecord());
		expect(JSON.parse(JSON.stringify(list))).toEqual({
			id: "1",
			name: "Work",
			createdAt: "2026-01-01T00:00:00.000Z",
			position: now.getTime(),
		});
	});

	it("moves to a position and treats records without one as positioned at creation", () => {
		const list = TodoList.create("u", "1", "Work", now);
		expect(list.moveTo(3).position).toBe(3);
		expect(list.moveTo(3).rename("Home").position).toBe(3);
		expect(() => list.moveTo(Number.NaN)).toThrow(ValidationError);
		const { position: _position, ...legacy } = list.toRecord();
		expect(TodoList.restore(legacy).position).toBe(now.getTime());
	});

	it("is stored per owner in memory", async () => {
		const repo = new InMemoryTodoListRepository();
		const list = TodoList.create("u", "1", "Work", now);
		await repo.save(list);
		expect(await repo.findById("u", "1")).toBe(list);
		expect(await repo.findById("other", "1")).toBeNull();
		expect(await repo.list("u")).toEqual([list]);
		await repo.delete("u", "1");
		expect(await repo.list("u")).toEqual([]);
	});
});
