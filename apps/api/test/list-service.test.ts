import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../src/domain/errors";
import { FixedClock, createServices } from "./support/fixtures";

describe("ListService", () => {
	it("creates, gets, renames and lists in creation order", async () => {
		const clock = new FixedClock();
		const { lists } = createServices(clock);
		const first = await lists.create("u", { name: "First" });
		clock.advance(1000);
		const second = await lists.create("u", { name: "Second" });
		const sameTime = await lists.create("u", { name: "Third" });
		expect((await lists.get("u", first.id)).name).toBe("First");
		expect((await lists.update("u", first.id, { name: "Renamed" })).name).toBe("Renamed");
		expect((await lists.list("u")).map((list) => list.id)).toEqual([
			first.id,
			second.id,
			sameTime.id,
		]);
	});

	it("reorders lists by position and validates the input", async () => {
		const clock = new FixedClock();
		const { lists } = createServices(clock);
		const first = await lists.create("u", { name: "First" });
		clock.advance(1000);
		const second = await lists.create("u", { name: "Second" });
		const moved = await lists.update("u", second.id, { position: first.position - 1 });
		expect(moved.position).toBe(first.position - 1);
		expect((await lists.list("u")).map((list) => list.id)).toEqual([second.id, first.id]);
		expect((await lists.update("u", first.id, { position: 3 })).name).toBe("First");
		const both = await lists.update("u", first.id, { name: "Both", position: 5 });
		expect([both.name, both.position]).toEqual(["Both", 5]);
		await expect(lists.update("u", first.id, {})).rejects.toThrow(
			"name, position or groupId is required",
		);
		await expect(lists.update("u", first.id, { position: "x" })).rejects.toThrow(
			"position must be a number",
		);
		await expect(lists.update("u", first.id, { position: Infinity })).rejects.toThrow(
			"position must be a number",
		);
	});

	it("creates idempotently when the client supplies an id", async () => {
		const { lists } = createServices();
		const first = await lists.create("u", { id: "list-1", name: "A" });
		const second = await lists.create("u", { id: "list-1", name: "B" });
		expect(second).toBe(first);
		expect(first.id).toBe("list-1");
		await expect(lists.create("u", { id: "bad id", name: "A" })).rejects.toThrow(ValidationError);
	});

	it("requires a string name", async () => {
		const { lists } = createServices();
		await expect(lists.create("u", {})).rejects.toThrow(ValidationError);
		await expect(lists.create("u", { name: 4 })).rejects.toThrow("name must be a string");
	});

	it("scopes lists to their owner", async () => {
		const { lists } = createServices();
		const list = await lists.create("u", { name: "A" });
		await expect(lists.get("other", list.id)).rejects.toThrow(NotFoundError);
		await expect(lists.update("other", list.id, { name: "B" })).rejects.toThrow(NotFoundError);
		await expect(lists.delete("other", list.id)).rejects.toThrow(NotFoundError);
	});

	it("deletes a list together with its tasks only", async () => {
		const { lists, tasks } = createServices();
		const list = await lists.create("u", { name: "A" });
		const inList = await tasks.create("u", { title: "in", listId: list.id });
		const outside = await tasks.create("u", { title: "out" });
		await lists.delete("u", list.id);
		await expect(tasks.get("u", inList.id)).rejects.toThrow(NotFoundError);
		expect((await tasks.get("u", outside.id)).title).toBe("out");
		await expect(lists.get("u", list.id)).rejects.toThrow(NotFoundError);
	});
});
