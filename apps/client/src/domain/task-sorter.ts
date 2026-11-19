import type { Task } from "./task";
import type { TaskOrder } from "./task-view";
import type { SortKey } from "./view-settings";

export type TaskComparator = (a: Task, b: Task) => number;

export class TaskSorter {
	static comparator(sort: SortKey | null, viewOrder: TaskOrder, today: string): TaskComparator {
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
					Number(b.isInMyDay(today)) - Number(a.isInMyDay(today)) || TaskSorter.newest(a, b);
			default:
				return viewOrder === "due" ? TaskSorter.byDue : TaskSorter.newest;
		}
	}

	private static byDue(a: Task, b: Task): number {
		return a.dueSortKey.localeCompare(b.dueSortKey) || TaskSorter.newest(a, b);
	}

	private static newest(a: Task, b: Task): number {
		return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
	}
}
