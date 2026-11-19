import { DueDay } from "./due-day";
import type { Task, TaskChanges } from "./task";
import type { TodoList } from "./todo-list";

export type IconName = "important" | "planned" | "all" | "tasks" | "list";

export type TaskOrder = "newest" | "due";

export abstract class TaskView {
	abstract readonly id: string;
	abstract readonly title: string;
	abstract readonly icon: IconName;
	readonly order: TaskOrder = "newest";
	readonly isCustomList: boolean = false;
	readonly showsListName: boolean = true;

	abstract matches(task: Task): boolean;

	defaultsForNewTask(_today: string): TaskChanges {
		return {};
	}
}

export class ImportantView extends TaskView {
	readonly id = "important";
	readonly title = "Important";
	readonly icon = "important";

	matches(task: Task): boolean {
		return task.important;
	}

	override defaultsForNewTask(): TaskChanges {
		return { importance: "high" };
	}
}

export class PlannedView extends TaskView {
	readonly id = "planned";
	readonly title = "Planned";
	readonly icon = "planned";
	override readonly order = "due";

	matches(task: Task): boolean {
		return task.dueDay !== null;
	}

	override defaultsForNewTask(today: string): TaskChanges {
		return { dueDate: DueDay.toIso(today) };
	}
}

export class AllTasksView extends TaskView {
	readonly id = "all";
	readonly title = "All tasks";
	readonly icon = "all";

	matches(): boolean {
		return true;
	}
}

export class DefaultListView extends TaskView {
	readonly id = "tasks";
	readonly title = "Tasks";
	readonly icon = "tasks";
	override readonly showsListName = false;

	matches(task: Task): boolean {
		return task.listId === null;
	}
}

export class CustomListView extends TaskView {
	readonly icon = "list";
	override readonly isCustomList = true;
	override readonly showsListName = false;

	constructor(readonly list: TodoList) {
		super();
	}

	get id(): string {
		return this.list.id;
	}

	get title(): string {
		return this.list.name;
	}

	matches(task: Task): boolean {
		return task.listId === this.list.id;
	}

	override defaultsForNewTask(): TaskChanges {
		return { listId: this.list.id };
	}
}

export class ViewCatalog {
	static build(lists: readonly TodoList[]): TaskView[] {
		return [
			new ImportantView(),
			new PlannedView(),
			new AllTasksView(),
			new DefaultListView(),
			...lists.map((list) => new CustomListView(list)),
		];
	}
}
