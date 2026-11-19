import type { SoundPlayer } from "../audio/sound-player";
import { DueDay } from "../domain/due-day";
import type { Clock, IdGenerator } from "../domain/ports";
import { Task, type TaskChanges } from "../domain/task";
import { TaskView, ViewCatalog } from "../domain/task-view";
import { TodoList } from "../domain/todo-list";
import type { LocalDatabase, Snapshot } from "../storage/local-database";
import { Outbox } from "../sync/outbox";
import type { Operation } from "../sync/operation";
import type { SyncTrigger } from "../sync/sync-coordinator";
import { Observable } from "./observable";

const DEFAULT_VIEW_ID = "my-day";

export interface TodoState {
	readonly lists: readonly TodoList[];
	readonly tasks: readonly Task[];
	readonly views: readonly TaskView[];
	readonly selectedViewId: string;
	readonly selectedTaskId: string | null;
	readonly pendingChanges: number;
	readonly today: string;
}

export interface VisibleTasks {
	readonly open: readonly Task[];
	readonly done: readonly Task[];
}

export class TodoStore extends Observable<TodoState> {
	constructor(
		private readonly database: LocalDatabase,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
		private readonly trigger: SyncTrigger,
		private readonly sounds: SoundPlayer,
	) {
		super(TodoStore.derive(database.get(), DEFAULT_VIEW_ID, null, DueDay.fromDate(clock.now())));
		database.subscribe(() => {
			const { selectedViewId, selectedTaskId } = this.get();
			this.set(
				TodoStore.derive(
					database.get(),
					selectedViewId,
					selectedTaskId,
					DueDay.fromDate(clock.now()),
				),
			);
		});
	}

	private static derive(
		snapshot: Snapshot,
		selectedViewId: string,
		selectedTaskId: string | null,
		today: string,
	): TodoState {
		const lists = snapshot.lists.map((data) => new TodoList(data));
		const views = ViewCatalog.build(lists);
		const tasks = snapshot.tasks.map((data) => new Task(data));
		return {
			lists,
			tasks,
			views,
			selectedViewId: views.some((view) => view.id === selectedViewId)
				? selectedViewId
				: DEFAULT_VIEW_ID,
			selectedTaskId: tasks.some((task) => task.id === selectedTaskId) ? selectedTaskId : null,
			pendingChanges: snapshot.outbox.length,
			today,
		};
	}

	get selectedView(): TaskView {
		const { views, selectedViewId } = this.get();
		return views.find((view) => view.id === selectedViewId)!;
	}

	get selectedTask(): Task | null {
		const { tasks, selectedTaskId } = this.get();
		return tasks.find((task) => task.id === selectedTaskId) ?? null;
	}

	get today(): string {
		return this.get().today;
	}

	refreshToday(): void {
		const today = DueDay.fromDate(this.clock.now());
		if (today !== this.get().today) {
			this.set({ ...this.get(), today });
		}
	}

	visibleTasks(): VisibleTasks {
		const view = this.selectedView;
		const today = this.today;
		const matching = this.get().tasks.filter((task) => view.matches(task, today));
		const compare =
			view.order === "due"
				? (a: Task, b: Task) => a.dueSortKey.localeCompare(b.dueSortKey) || TodoStore.newest(a, b)
				: TodoStore.newest;
		return {
			open: matching.filter((task) => !task.completed).sort(compare),
			done: matching.filter((task) => task.completed).sort(compare),
		};
	}

	listName(task: Task): string {
		const list = this.get().lists.find((candidate) => candidate.id === task.listId);
		return list === undefined ? DEFAULT_VIEW_NAME : list.name;
	}

	taskCount(view: TaskView): number {
		return this.get().tasks.filter((task) => !task.completed && view.matches(task, this.today))
			.length;
	}

	select(viewId: string): void {
		const known = this.get().views.some((view) => view.id === viewId);
		this.set({
			...this.get(),
			selectedViewId: known ? viewId : DEFAULT_VIEW_ID,
			selectedTaskId: null,
		});
	}

	selectTask(taskId: string | null): void {
		this.set({ ...this.get(), selectedTaskId: taskId });
	}

	addTask(title: string): string | null {
		const trimmed = title.trim();
		if (trimmed.length === 0) {
			return null;
		}
		const base = Task.create(this.ids.next(), trimmed, this.clock.now().toISOString());
		const task = base.with(this.selectedView.defaultsForNewTask(this.today));
		this.commit((snapshot) => ({
			...snapshot,
			tasks: [...snapshot.tasks, task.data],
			outbox: this.enqueue(snapshot, {
				kind: "createTask",
				opId: this.ids.next(),
				task: task.data,
			}),
		}));
		return task.id;
	}

	updateTask(taskId: string, changes: TaskChanges): void {
		if (!this.get().tasks.some((task) => task.id === taskId)) {
			return;
		}
		this.commit((snapshot) => ({
			...snapshot,
			tasks: snapshot.tasks.map((data) =>
				data.id === taskId ? new Task(data).with(changes).data : data,
			),
			outbox: this.enqueue(snapshot, {
				kind: "updateTask",
				opId: this.ids.next(),
				taskId,
				changes,
			}),
		}));
	}

	renameTask(taskId: string, title: string): void {
		const trimmed = title.trim();
		if (trimmed.length > 0) {
			this.updateTask(taskId, { title: trimmed });
		}
	}

	toggleCompleted(taskId: string): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task !== undefined) {
			if (!task.completed) {
				this.sounds.playCompleted();
			}
			this.updateTask(taskId, { completed: !task.completed });
		}
	}

	toggleImportant(taskId: string): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task !== undefined) {
			this.updateTask(taskId, {
				importance: task.important ? "normal" : "high",
			});
		}
	}

	toggleMyDay(taskId: string): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task !== undefined) {
			this.updateTask(
				taskId,
				task.isInMyDay(this.today)
					? { myDay: null, myDayDismissed: this.today }
					: { myDay: this.today, myDayDismissed: null },
			);
		}
	}

	setDueDay(taskId: string, day: string | null): void {
		this.updateTask(taskId, {
			dueDate: day === null ? null : DueDay.toIso(day),
		});
	}

	moveTask(taskId: string, listId: string | null): void {
		this.updateTask(taskId, { listId });
	}

	deleteTask(taskId: string): void {
		this.commit((snapshot) => ({
			...snapshot,
			tasks: snapshot.tasks.filter((data) => data.id !== taskId),
			outbox: this.enqueue(snapshot, {
				kind: "deleteTask",
				opId: this.ids.next(),
				taskId,
			}),
		}));
	}

	addList(name: string): string | null {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			return null;
		}
		const list = TodoList.create(this.ids.next(), trimmed, this.clock.now().toISOString());
		this.commit((snapshot) => ({
			...snapshot,
			lists: [...snapshot.lists, list.data],
			outbox: this.enqueue(snapshot, {
				kind: "createList",
				opId: this.ids.next(),
				list: list.data,
			}),
		}));
		this.select(list.id);
		return list.id;
	}

	renameList(listId: string, name: string): void {
		const trimmed = name.trim();
		if (trimmed.length === 0 || !this.get().lists.some((list) => list.id === listId)) {
			return;
		}
		this.commit((snapshot) => ({
			...snapshot,
			lists: snapshot.lists.map((data) =>
				data.id === listId ? new TodoList(data).rename(trimmed).data : data,
			),
			outbox: this.enqueue(snapshot, {
				kind: "renameList",
				opId: this.ids.next(),
				listId,
				name: trimmed,
			}),
		}));
	}

	deleteList(listId: string): void {
		if (!this.get().lists.some((list) => list.id === listId)) {
			return;
		}
		this.commit((snapshot) => {
			const doomed = new Set(
				snapshot.tasks.filter((data) => data.listId === listId).map((data) => data.id),
			);
			const outbox = new Outbox(snapshot.outbox)
				.discardTasks(doomed)
				.enqueue({ kind: "deleteList", opId: this.ids.next(), listId });
			return {
				...snapshot,
				lists: snapshot.lists.filter((data) => data.id !== listId),
				tasks: snapshot.tasks.filter((data) => data.listId !== listId),
				outbox: outbox.operations,
			};
		});
	}

	private enqueue(snapshot: Snapshot, operation: Operation): readonly Operation[] {
		return new Outbox(snapshot.outbox).enqueue(operation).operations;
	}

	private commit(mutation: (snapshot: Snapshot) => Snapshot): void {
		void this.database.apply(mutation);
		this.trigger.request();
	}

	private static newest(a: Task, b: Task): number {
		return b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id);
	}
}

const DEFAULT_VIEW_NAME = "Tasks";
