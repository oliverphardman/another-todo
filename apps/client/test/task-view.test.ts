import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import {
	AllTasksView,
	CustomListView,
	DefaultListView,
	ImportantView,
	MyDayView,
	PlannedView,
	ViewCatalog,
} from "../src/domain/task-view";
import { TodoList } from "../src/domain/todo-list";

const task = Task.create("1", "A", "x");

describe("task views", () => {
	it("important matches starred tasks and stars new ones", () => {
		const view = new ImportantView();
		expect(view.matches(task)).toBe(false);
		expect(view.matches(task.with({ importance: "high" }))).toBe(true);
		expect(view.defaultsForNewTask()).toEqual({ importance: "high" });
	});

	it("planned matches dated tasks, orders by due date and dates new ones", () => {
		const view = new PlannedView();
		expect(view.matches(task)).toBe(false);
		expect(view.matches(task.with({ dueDate: "2026-11-20T00:00:00.000Z" }))).toBe(true);
		expect(view.order).toBe("due");
		expect(view.defaultsForNewTask("2026-11-19")).toEqual({ dueDate: "2026-11-19T00:00:00.000Z" });
	});

	it("all matches everything with no defaults", () => {
		const view = new AllTasksView();
		expect(view.matches()).toBe(true);
		expect(view.defaultsForNewTask("2026-11-19")).toEqual({});
		expect(view.order).toBe("newest");
		expect(view.showsListName).toBe(true);
		expect(view.isCustomList).toBe(false);
	});

	it("the default list matches unlisted tasks", () => {
		const view = new DefaultListView();
		expect(view.matches(task)).toBe(true);
		expect(view.matches(task.with({ listId: "l" }))).toBe(false);
		expect(view.showsListName).toBe(false);
	});

	it("custom lists match their tasks and assign new ones", () => {
		const view = new CustomListView(TodoList.create("l", "Work", "x"));
		expect(view.id).toBe("l");
		expect(view.title).toBe("Work");
		expect(view.matches(task.with({ listId: "l" }))).toBe(true);
		expect(view.matches(task)).toBe(false);
		expect(view.defaultsForNewTask()).toEqual({ listId: "l" });
		expect(view.isCustomList).toBe(true);
	});

	it("My Day matches tasks added today, is dated and adds new tasks to today", () => {
		const view = new MyDayView();
		expect(view.matches(task.with({ myDay: "2026-11-19" }), "2026-11-19")).toBe(true);
		expect(view.matches(task.with({ myDay: "2026-11-18" }), "2026-11-19")).toBe(false);
		expect(view.matches(task, "2026-11-19")).toBe(false);
		expect(view.showsDate).toBe(true);
		expect(view.titleKey).toBe("view.myDay");
		expect(view.defaultsForNewTask("2026-11-19")).toEqual({ myDay: "2026-11-19" });
		expect(view.showsMyDay).toBe(false);
		expect(new ImportantView().showsDate).toBe(false);
		expect(new ImportantView().showsMyDay).toBe(true);
	});

	it("the catalog lists My Day and the smart views, the default list, then custom lists", () => {
		const views = ViewCatalog.build([TodoList.create("l", "Work", "x")]);
		expect(views.map((view) => view.id)).toEqual([
			"my-day",
			"important",
			"planned",
			"all",
			"tasks",
			"l",
		]);
	});
});

describe("list positions", () => {
	it("defaults to the creation time, tolerates bad dates and sorts views by position then id", () => {
		const early = TodoList.create("b", "Early", "2026-01-01T00:00:00.000Z");
		const late = TodoList.create("a", "Late", "2026-02-01T00:00:00.000Z");
		expect(early.position).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
		expect(TodoList.create("x", "Bad", "x").position).toBe(0);
		expect(new TodoList({ id: "l", name: "L", createdAt: "x" }).position).toBe(0);
		expect(
			new TodoList({ id: "l", name: "L", createdAt: "2026-01-01T00:00:00.000Z" }).position,
		).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
		expect(early.moveTo(9).position).toBe(9);
		expect(early.moveTo(9).rename("N").position).toBe(9);
		const tie = TodoList.create("c", "Tie", "2026-01-01T00:00:00.000Z");
		expect(ViewCatalog.ordered([late, tie, early]).map((list) => list.id)).toEqual(["b", "c", "a"]);
		expect(
			ViewCatalog.build([late, early])
				.filter((view) => view.isCustomList)
				.map((view) => view.title),
		).toEqual(["Early", "Late"]);
	});
});
