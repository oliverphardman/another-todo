import type { Group } from "../domain/group";
import type { Clock } from "../domain/ports";
import type { Task } from "../domain/task";
import { CustomListView, DefaultListView, type TaskView } from "../domain/task-view";
import type { TodoList } from "../domain/todo-list";
import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import type { ExportDocument, ExportedList, ExportedTask } from "./export-document";

export interface ListChoice {
	readonly id: string;
	readonly name: string;
	readonly view: TaskView;
}

export interface ListChoiceGroup {
	readonly group: Group | null;
	readonly lists: readonly ListChoice[];
}

export class ExportDocumentBuilder {
	constructor(
		private readonly store: TodoStore,
		private readonly clock: Clock,
		private readonly i18n: I18n,
	) {}

	choices(): ListChoiceGroup[] {
		const { groups } = this.store.get();
		const lists = this.store.orderedLists();
		const grouped = (list: TodoList) => groups.some((group) => group.id === list.groupId);
		const defaultList = new DefaultListView();
		const loose: ListChoice[] = [
			{ id: defaultList.id, name: this.i18n.viewTitle(defaultList), view: defaultList },
			...lists.filter((list) => !grouped(list)).map(ExportDocumentBuilder.choice),
		];
		return [
			{ group: null, lists: loose },
			...groups
				.map((group) => ({
					group,
					lists: lists
						.filter((list) => list.groupId === group.id)
						.map(ExportDocumentBuilder.choice),
				}))
				.filter((entry) => entry.lists.length > 0),
		];
	}

	forView(view: TaskView): ExportDocument {
		const name = this.i18n.viewTitle(view);
		const list: ExportedList = {
			name,
			group: view instanceof CustomListView ? this.groupName(view.list.groupId) : null,
			subtitle: view.showsDate ? this.i18n.longDay(this.store.today) : null,
			tasks: this.tasks(view),
		};
		return this.document(name, [list]);
	}

	forLists(ids: ReadonlySet<string>): ExportDocument {
		const lists = this.choices().flatMap(({ group, lists: entries }) =>
			entries
				.filter((entry) => ids.has(entry.id))
				.map((entry): ExportedList => ({
					name: entry.name,
					group: group?.name ?? null,
					subtitle: null,
					tasks: this.tasks(entry.view),
				})),
		);
		const title = lists.length === 1 ? lists[0]!.name : this.i18n.t("app.name");
		return this.document(title, lists);
	}

	private static choice(list: TodoList): ListChoice {
		return { id: list.id, name: list.name, view: new CustomListView(list) };
	}

	private document(title: string, lists: readonly ExportedList[]): ExportDocument {
		return {
			title,
			lists,
			today: this.store.today,
			exportedAt: this.clock.now().toISOString(),
		};
	}

	private tasks(view: TaskView): ExportedTask[] {
		const { open, done } = this.store.tasksIn(view);
		return [...open, ...done].map((task) => this.exported(task));
	}

	private exported(task: Task): ExportedTask {
		const list = this.store.get().lists.find((candidate) => candidate.id === task.listId);
		return {
			task,
			list: list?.name ?? this.i18n.t("view.tasks"),
			group: this.groupName(list?.groupId ?? null),
			inMyDay: this.store.isInMyDay(task),
		};
	}

	private groupName(groupId: string | null): string | null {
		return this.store.get().groups.find((group) => group.id === groupId)?.name ?? null;
	}
}
