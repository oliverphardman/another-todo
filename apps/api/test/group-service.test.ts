import { describe, expect, it } from "vitest";
import { Group } from "../src/domain/group";
import { NotFoundError, ValidationError } from "../src/domain/errors";
import { FixedClock, createServices } from "./support/fixtures";
import { event } from "./support/events";
import { createTestApi } from "./support/test-api";

describe("Group", () => {
	const now = new Date("2026-01-01T00:00:00Z");

	it("trims names, moves, renames and round-trips", () => {
		const group = Group.create("u", "g", "  Home ", now);
		expect(group.name).toBe("Home");
		expect(group.rename("Work").name).toBe("Work");
		expect(group.moveTo(4).position).toBe(4);
		expect(() => group.moveTo(Number.NaN)).toThrow(ValidationError);
		expect(() => Group.create("u", "g", " ", now)).toThrow(ValidationError);
		expect(Group.restore(group.toRecord()).toRecord()).toEqual(group.toRecord());
		const { position: _position, ...legacy } = group.toRecord();
		expect(Group.restore(legacy).position).toBe(now.getTime());
		expect(JSON.parse(JSON.stringify(group))).toEqual({
			id: "g",
			name: "Home",
			createdAt: now.toISOString(),
			position: now.getTime(),
		});
	});
});

describe("GroupService", () => {
	it("creates idempotently, lists by position, updates and validates", async () => {
		const clock = new FixedClock();
		const { groups } = createServices(clock);
		const first = await groups.create("u", { id: "g1", name: "First" });
		expect((await groups.create("u", { id: "g1", name: "Other" })).name).toBe("First");
		clock.advance(1000);
		const second = await groups.create("u", { name: "Second" });
		expect((await groups.list("u")).map((group) => group.id)).toEqual([first.id, second.id]);
		await groups.update("u", second.id, { position: first.position - 1 });
		expect((await groups.list("u")).map((group) => group.id)).toEqual([second.id, first.id]);
		expect((await groups.update("u", first.id, { name: "Renamed", position: 9 })).name).toBe(
			"Renamed",
		);
		expect((await groups.get("u", first.id)).position).toBe(9);
		expect((await groups.update("u", first.id, { name: "Only name" })).position).toBe(9);
		await expect(groups.create("u", {})).rejects.toThrow("name must be a string");
		await expect(groups.update("u", first.id, {})).rejects.toThrow("name or position is required");
		await expect(groups.update("u", first.id, { position: "x" })).rejects.toThrow(
			"position must be a number",
		);
		await expect(groups.get("other", first.id)).rejects.toThrow(NotFoundError);
	});

	it("breaks position ties by id", async () => {
		const { groups } = createServices();
		await groups.create("u", { id: "b", name: "B" });
		await groups.create("u", { id: "a", name: "A" });
		expect((await groups.list("u")).map((group) => group.id)).toEqual(["a", "b"]);
	});

	it("ungroups its lists when it is deleted", async () => {
		const { groups, lists } = createServices();
		const group = await groups.create("u", { name: "G" });
		const inside = await lists.create("u", { name: "In" });
		const outside = await lists.create("u", { name: "Out" });
		await lists.update("u", inside.id, { groupId: group.id });
		await lists.update("u", outside.id, { name: "Out" });
		expect((await lists.get("u", inside.id)).groupId).toBe(group.id);
		await groups.delete("u", group.id);
		expect((await lists.get("u", inside.id)).groupId).toBeNull();
		await expect(groups.delete("u", group.id)).rejects.toThrow(NotFoundError);
	});

	it("only assigns lists to groups that exist", async () => {
		const { groups, lists } = createServices();
		const group = await groups.create("u", { name: "G" });
		const list = await lists.create("u", { name: "L" });
		await expect(lists.update("u", list.id, { groupId: "ghost" })).rejects.toThrow(NotFoundError);
		await expect(lists.update("u", list.id, { groupId: 4 })).rejects.toThrow(
			"groupId must be a string or null",
		);
		await expect(lists.update("u", list.id, {})).rejects.toThrow(
			"name, position or groupId is required",
		);
		expect((await lists.update("u", list.id, { groupId: group.id })).groupId).toBe(group.id);
		expect((await lists.update("u", list.id, { groupId: null })).groupId).toBeNull();
	});
});

describe("Groups API", () => {
	it("creates, reads, renames, groups a list and deletes", async () => {
		const api = createTestApi();
		const created = await api(event({ method: "POST", path: "/groups", body: { name: "Home" } }));
		expect(created.status).toBe(201);
		const id = created.body.id;
		expect((await api(event({ path: `/groups/${id}` }))).body.name).toBe("Home");
		const renamed = await api(
			event({ method: "PATCH", path: `/groups/${id}`, body: { name: "House", position: 3 } }),
		);
		expect(renamed.body).toMatchObject({ name: "House", position: 3 });
		const list = (await api(event({ method: "POST", path: "/lists", body: { name: "Chores" } })))
			.body;
		expect(list.groupId).toBeNull();
		const grouped = await api(
			event({ method: "PATCH", path: `/lists/${list.id}`, body: { groupId: id } }),
		);
		expect(grouped.body.groupId).toBe(id);
		expect((await api(event({ path: "/groups" }))).body.groups).toHaveLength(1);
		expect((await api(event({ method: "DELETE", path: `/groups/${id}` }))).status).toBe(204);
		expect((await api(event({ path: `/lists/${list.id}` }))).body.groupId).toBeNull();
		expect((await api(event({ path: `/groups/${id}` }))).status).toBe(404);
		expect((await api(event({ method: "POST", path: "/groups", body: {} }))).status).toBe(400);
		expect((await api(event({ method: "PATCH", path: "/groups/x", body: {} }))).status).toBe(400);
	});
});
