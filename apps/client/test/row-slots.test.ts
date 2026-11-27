import { describe, expect, it } from "vitest";
import { RowSlots } from "../src/ui/row-slots";

const items = (...keys: string[]) =>
	keys.map((key) => ({ key, kind: key.startsWith("section") ? "section" : "task" }));
const slots = (assigned: ReadonlyMap<string, string>) => [...assigned.values()];

describe("RowSlots", () => {
	it("hands the next list the rows of the last one, kind by kind", () => {
		const rows = new RowSlots();
		const first = slots(rows.assign("work", items("a", "section-done", "b")));
		const second = slots(rows.assign("home", items("c", "d", "section-done")));
		expect(first).toEqual(["task-0", "section-0", "task-1"]);
		expect(second).toEqual(["task-0", "task-1", "section-0"]);
	});

	it("keeps each item on its row while the list stays open", () => {
		const rows = new RowSlots();
		rows.assign("work", items("a", "b"));
		const reordered = rows.assign("work", items("b", "a"));
		expect([...reordered]).toEqual([
			["b", "task-1"],
			["a", "task-0"],
		]);
	});

	it("gives a newcomer a row nothing else has used", () => {
		const rows = new RowSlots();
		rows.assign("work", items("a", "b"));
		const replaced = rows.assign("work", items("b", "c"));
		const again = rows.assign("work", items("b", "c", "d"));
		expect(replaced.get("c")).toBe("task-new-0");
		expect(slots(again)).toEqual(["task-1", "task-new-0", "task-new-1"]);
	});
});
