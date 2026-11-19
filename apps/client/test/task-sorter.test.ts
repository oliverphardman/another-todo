import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { TaskSorter } from "../src/domain/task-sorter";

const TODAY = "2026-11-19";

function task(id: string, title: string, createdAt: string, changes = {}) {
	return Task.create(id, title, createdAt).with(changes);
}

const tasks = [
	task("a", "banana", "2026-11-01T00:00:00.000Z", {
		importance: "high",
		dueDate: "2026-11-25T00:00:00.000Z",
	}),
	task("b", "Apple", "2026-11-03T00:00:00.000Z", { myDay: TODAY }),
	task("c", "cherry", "2026-11-02T00:00:00.000Z", { dueDate: "2026-11-20T00:00:00.000Z" }),
	task("d", "apple", "2026-11-03T00:00:00.000Z"),
];

const order = (
	sort: Parameters<typeof TaskSorter.comparator>[0],
	view: "newest" | "due" = "newest",
) => [...tasks].sort(TaskSorter.comparator(sort, view, TODAY)).map((entry) => entry.id);

describe("TaskSorter", () => {
	it("defaults to newest first, or by due date for dated views", () => {
		expect(order(null)).toEqual(["b", "d", "c", "a"]);
		expect(order(null, "due")).toEqual(["c", "a", "b", "d"]);
	});

	it("puts important tasks first, newest first within each group", () => {
		expect(order("importance")).toEqual(["a", "b", "d", "c"]);
	});

	it("sorts alphabetically ignoring case, newest first for equal titles", () => {
		expect(order("alphabetical")).toEqual(["b", "d", "a", "c"]);
	});

	it("sorts by due date with undated tasks last", () => {
		expect(order("due")).toEqual(["c", "a", "b", "d"]);
	});

	it("sorts by creation date, oldest first", () => {
		expect(order("created")).toEqual(["a", "c", "b", "d"]);
	});

	it("puts tasks added to My Day first", () => {
		expect(order("myDay")).toEqual(["b", "d", "c", "a"]);
	});
});
