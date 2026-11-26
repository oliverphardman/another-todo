import type { Task } from "./task";
import type { TaskOrder } from "./task-view";
import type { SortKey } from "./view-settings";

export type TaskComparator = (a: Task, b: Task) => number;

export class TaskSorter {
	static comparator(
		sort: SortKey | null,
		viewOrder: TaskOrder,
		today: string,
		descending = false,
		includeDueToday = true,
	): TaskComparator {
		const base = TaskSorter.ascending(sort, viewOrder, today, includeDueToday);
		return sort !== null && descending ? (a, b) => base(b, a) : base;
	}

	private static ascending(
		sort: SortKey | null,
		viewOrder: TaskOrder,
		today: string,
		includeDueToday: boolean,
	): TaskComparator {
		switch (sort) {
			case "importance":
				return (a, b) => Number(b.important) - Number(a.important) || TaskSorter.newest(a, b);
			case "alphabetical":
				return (a, b) =>
					a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) ||
					TaskSorter.newest(a, b);
			case "due":
				return TaskSorter.byDue;
			case "created":
				return (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
			case "myDay":
				return (a, b) =>
					Number(b.isInMyDay(today, includeDueToday)) -
						Number(a.isInMyDay(today, includeDueToday)) || TaskSorter.newest(a, b);
			default:
				return viewOrder === "due" ? TaskSorter.byDue : TaskSorter.manual;
		}
	}

	private static byDue(a: Task, b: Task): number {
		return a.dueSortKey.localeCompare(b.dueSortKey) || TaskSorter.newest(a, b);
	}

	private static manual(a: Task, b: Task): number {
		return a.manualKey - b.manualKey || a.id.localeCompare(b.id);
	}

	private static newest(a: Task, b: Task): number {
		return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
	}
}
