import { describe, expect, it } from "vitest";
import { Group } from "../src/domain/group";

describe("Group", () => {
	it("defaults its position to the creation time and renames immutably", () => {
		const group = Group.create("g", "Home", "2026-01-01T00:00:00.000Z");
		expect(group.id).toBe("g");
		expect(group.position).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
		expect(group.rename("House").name).toBe("House");
		expect(group.name).toBe("Home");
		expect(Group.create("g", "Bad", "x").position).toBe(0);
		expect(new Group({ id: "g", name: "N", createdAt: "x" }).position).toBe(0);
		expect(new Group({ id: "g", name: "N", createdAt: "x", position: 7 }).position).toBe(7);
	});
});
