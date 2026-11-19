import { DueDay } from "./due-day";
import type { MessageKey } from "../i18n/en-us";
import type { Task, TaskChanges } from "./task";
import type { TodoList } from "./todo-list";

export type IconName = "myDay" | "important" | "planned" | "all" | "tasks" | "list";

export type TaskOrder = "newest" | "due";

export abstract class TaskView {
	abstract readonly id: string;
	abstract readonly title: string;
	abstract readonly titleKey: MessageKey | null;
	abstract readonly icon: IconName;
	readonly order: TaskOrder = "newest";
	readonly isCustomList: boolean = false;
	readonly showsListName: boolean = true;
	readonly showsMyDay: boolean = true;
	readonly showsDate: boolean = false;

	abstract matches(task: Task, today: string): boolean;

	defaultsForNewTask(_today: string): TaskChanges {
		return {};
	}
}

export class MyDayView extends TaskView {
	readonly id = "my-day";
	readonly title = "My Day";
	readonly titleKey = "view.myDay";
	readonly icon = "myDay";
	override readonly showsMyDay = false;
	override readonly showsDate = true;

	matches(task: Task, today: string): boolean {
		return task.isInMyDay(today);
	}

	override defaultsForNewTask(today: string): TaskChanges {
		return { myDay: today };
	}
}

export class ImportantView extends TaskView {
	readonly id = "important";
	readonly title = "Important";
	readonly titleKey = "view.important";
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
	readonly titleKey = "view.planned";
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
	readonly titleKey = "view.all";
	readonly icon = "all";

	matches(): boolean {
		return true;
	}
}

export class DefaultListView extends TaskView {
	readonly id = "tasks";
	readonly title = "Tasks";
	readonly titleKey = "view.tasks";
	readonly icon = "tasks";
	override readonly showsListName = false;

	matches(task: Task): boolean {
		return task.listId === null;
	}
}

export class CustomListView extends TaskView {
	readonly icon = "list";
	readonly titleKey = null;
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
	static ordered(lists: readonly TodoList[]): TodoList[] {
		return [...lists].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
	}

	static build(lists: readonly TodoList[]): TaskView[] {
		return [
			new MyDayView(),
			new ImportantView(),
			new PlannedView(),
			new AllTasksView(),
			new DefaultListView(),
			...ViewCatalog.ordered(lists).map((list) => new CustomListView(list)),
		];
	}
}
