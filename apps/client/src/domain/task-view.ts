import { DueDay } from "./due-day";
import type { MessageKey } from "../i18n/en-us";
import {
	DEFAULT_SETTINGS,
	type AppSettingsState,
	type MyDayPreferences,
	type OptionalList,
} from "../state/app-settings";
import type { Task, TaskChanges } from "./task";
import type { TodoList } from "./todo-list";

export type IconName = "myDay" | "important" | "planned" | "all" | "completed" | "tasks" | "list";

export type TaskOrder = "newest" | "due";

export type ViewPreferences = Pick<AppSettingsState, "lists" | "myDay">;

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
	readonly allowsAdding: boolean = true;
	readonly separatesCompleted: boolean = true;
	get canEditList(): boolean {
		return false;
	}

	abstract matches(task: Task, today: string): boolean;

	carriesOver(_task: Task, _today: string): boolean {
		return false;
	}

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

	constructor(private readonly preferences: MyDayPreferences = DEFAULT_SETTINGS.myDay) {
		super();
	}

	matches(task: Task, today: string): boolean {
		return task.isInMyDay(today, this.preferences.dueToday);
	}

	override carriesOver(task: Task, today: string): boolean {
		return (
			this.preferences.yesterday &&
			!task.completed &&
			!this.matches(task, today) &&
			task.data.myDay === DueDay.add(today, -1)
		);
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
	readonly title = "All";
	readonly titleKey = "view.all";
	readonly icon = "all";

	matches(): boolean {
		return true;
	}
}

export class CompletedView extends TaskView {
	readonly id = "completed";
	readonly title = "Completed";
	readonly titleKey = "view.completed";
	readonly icon = "completed";
	override readonly allowsAdding = false;
	override readonly separatesCompleted = false;

	matches(task: Task): boolean {
		return task.completed;
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

	override get canEditList(): boolean {
		return this.list.owned;
	}

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

export class SearchView extends TaskView {
	readonly id = "search";
	readonly title = "Search";
	readonly titleKey = "view.search";
	readonly icon = "all";
	override readonly allowsAdding = false;

	constructor(readonly query: string) {
		super();
	}

	matches(task: Task): boolean {
		const needle = this.query.toLowerCase();
		return [task.title, task.note, ...task.steps.map((step) => step.title)].some((text) =>
			text.toLowerCase().includes(needle),
		);
	}
}

export class ViewCatalog {
	static ordered(lists: readonly TodoList[]): TodoList[] {
		return [...lists].sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
	}

	static build(
		lists: readonly TodoList[],
		{ lists: shown, myDay }: ViewPreferences = DEFAULT_SETTINGS,
	): TaskView[] {
		const optional: Record<OptionalList, TaskView> = {
			important: new ImportantView(),
			planned: new PlannedView(),
			all: new AllTasksView(),
			completed: new CompletedView(),
		};
		return [
			new MyDayView(myDay),
			...(["important", "planned", "all", "completed"] as const)
				.filter((id) => shown[id])
				.map((id) => optional[id]),
			new DefaultListView(),
			...ViewCatalog.ordered(lists).map((list) => new CustomListView(list)),
		];
	}
}
