import type { SoundPlayer } from "../audio/sound-player";
import { DueDay } from "../domain/due-day";
import type { Clock, IdGenerator } from "../domain/ports";
import { Task, type TaskChanges } from "../domain/task";
import { TaskSorter } from "../domain/task-sorter";
import type { TaskStepData } from "../domain/task-step";
import { TaskView, ViewCatalog } from "../domain/task-view";
import { TodoList } from "../domain/todo-list";
import { ViewSettings, type ViewSettingsChanges } from "../domain/view-settings";
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
	readonly settings: readonly ViewSettings[];
	readonly selectedViewId: string;
	readonly selectedTaskId: string | null;
	readonly selectedTaskIds: readonly string[];
	readonly anchorTaskId: string | null;
	readonly renamingViewId: string | null;
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
		super(
			TodoStore.derive(database.get(), DEFAULT_VIEW_ID, [], null, DueDay.fromDate(clock.now())),
		);
		database.subscribe(() => {
			const { selectedViewId, selectedTaskIds, anchorTaskId, renamingViewId } = this.get();
			this.set({
				...TodoStore.derive(
					database.get(),
					selectedViewId,
					selectedTaskIds,
					anchorTaskId,
					DueDay.fromDate(clock.now()),
				),
				renamingViewId,
			});
		});
	}

	private static derive(
		snapshot: Snapshot,
		selectedViewId: string,
		selectedIds: readonly string[],
		anchorId: string | null,
		today: string,
	): TodoState {
		const lists = snapshot.lists.map((data) => new TodoList(data));
		const views = ViewCatalog.build(lists);
		const tasks = snapshot.tasks.map((data) => new Task(data));
		return {
			lists,
			tasks,
			views,
			settings: snapshot.settings.map((data) => new ViewSettings(data)),
			selectedViewId: views.some((view) => view.id === selectedViewId)
				? selectedViewId
				: DEFAULT_VIEW_ID,
			...TodoStore.selection(
				selectedIds.filter((id) => tasks.some((task) => task.id === id)),
				tasks.some((task) => task.id === anchorId) ? anchorId : null,
			),
			renamingViewId: null,
			pendingChanges: snapshot.outbox.length,
			today,
		};
	}

	private static selection(
		ids: readonly string[],
		anchor: string | null,
	): Pick<TodoState, "selectedTaskId" | "selectedTaskIds" | "anchorTaskId"> {
		return {
			selectedTaskIds: ids,
			anchorTaskId: anchor,
			selectedTaskId: ids.length === 1 ? ids[0]! : null,
		};
	}

	get selectedTasks(): readonly Task[] {
		const { tasks, selectedTaskIds } = this.get();
		return tasks.filter((task) => selectedTaskIds.includes(task.id));
	}

	get selectedView(): TaskView {
		const { views, selectedViewId } = this.get();
		return views.find((view) => view.id === selectedViewId)!;
	}

	get selectedTask(): Task | null {
		const { tasks, selectedTaskId } = this.get();
		return tasks.find((task) => task.id === selectedTaskId) ?? null;
	}

	get now(): Date {
		return this.clock.now();
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
		const settings = this.settingsFor(view.id);
		const compare = TaskSorter.comparator(settings.sort, view.order, today);
		return {
			open: matching.filter((task) => !task.completed).sort(compare),
			done: settings.hideCompleted ? [] : matching.filter((task) => task.completed).sort(compare),
		};
	}

	settingsFor(viewId: string): ViewSettings {
		return (
			this.get().settings.find((settings) => settings.id === viewId) ??
			ViewSettings.defaults(viewId)
		);
	}

	updateSettings(viewId: string, changes: ViewSettingsChanges): void {
		const updated = this.settingsFor(viewId).with(changes);
		this.commit((snapshot) => ({
			...snapshot,
			settings: [...snapshot.settings.filter((entry) => entry.id !== viewId), updated.data],
			outbox: this.enqueue(snapshot, {
				kind: "putSettings",
				opId: this.ids.next(),
				settings: updated.data,
			}),
		}));
	}

	duplicateList(listId: string, copyName: string): string | null {
		const source = this.get().lists.find((list) => list.id === listId);
		if (source === undefined) {
			return null;
		}
		const now = this.clock.now().toISOString();
		const copy = TodoList.create(this.ids.next(), copyName, now);
		const tasks = this.get()
			.tasks.filter((task) => task.listId === listId)
			.map(
				(task) =>
					new Task({
						...task.data,
						id: this.ids.next(),
						listId: copy.id,
						createdAt: now,
						myDay: null,
						myDayDismissed: null,
						steps: task.steps.map((step) => ({ ...step, id: this.ids.next() })),
					}).data,
			);
		this.commit((snapshot) => {
			let outbox = new Outbox(snapshot.outbox).enqueue({
				kind: "createList",
				opId: this.ids.next(),
				list: copy.data,
			});
			for (const data of tasks) {
				outbox = outbox.enqueue({ kind: "createTask", opId: this.ids.next(), task: data });
			}
			return {
				...snapshot,
				lists: [...snapshot.lists, copy.data],
				tasks: [...snapshot.tasks, ...tasks],
				outbox: outbox.operations,
			};
		});
		this.select(copy.id);
		return copy.id;
	}

	listName(task: Task): string | null {
		const list = this.get().lists.find((candidate) => candidate.id === task.listId);
		return list === undefined ? null : list.name;
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
			renamingViewId: null,
			...TodoStore.selection([], null),
		});
	}

	startRenaming(listId: string): void {
		const known = this.get().views.some((view) => view.id === listId && view.isCustomList);
		if (known) {
			this.set({
				...this.get(),
				...TodoStore.selection([], null),
				selectedViewId: listId,
				renamingViewId: listId,
			});
		}
	}

	stopRenaming(): void {
		this.set({ ...this.get(), renamingViewId: null });
	}

	selectTask(taskId: string | null): void {
		this.set({
			...this.get(),
			...TodoStore.selection(taskId === null ? [] : [taskId], taskId),
		});
	}

	toggleTaskSelection(taskId: string): void {
		const current = this.get().selectedTaskIds;
		const ids = current.includes(taskId)
			? current.filter((id) => id !== taskId)
			: [...current, taskId];
		this.set({ ...this.get(), ...TodoStore.selection(ids, taskId) });
	}

	selectTaskRange(taskId: string): void {
		const { open, done } = this.visibleTasks();
		const order = [...open, ...done].map((task) => task.id);
		const anchor = this.get().anchorTaskId ?? taskId;
		const from = order.indexOf(anchor);
		const to = order.indexOf(taskId);
		if (from === -1 || to === -1) {
			this.selectTask(taskId);
			return;
		}
		const [start, end] = from <= to ? [from, to] : [to, from];
		this.set({
			...this.get(),
			...TodoStore.selection(order.slice(start, end + 1), anchor),
		});
	}

	completeTasks(taskIds: readonly string[], completed: boolean): void {
		const targets = this.targets(taskIds).filter((task) => task.completed !== completed);
		if (completed && targets.length > 0) {
			this.sounds.playCompleted();
		}
		for (const task of targets) {
			this.updateTask(task.id, { completed });
		}
	}

	setImportant(taskIds: readonly string[], important: boolean): void {
		for (const task of this.targets(taskIds).filter((entry) => entry.important !== important)) {
			this.updateTask(task.id, { importance: important ? "high" : "normal" });
		}
	}

	setInMyDay(taskIds: readonly string[], inMyDay: boolean): void {
		const today = this.today;
		for (const task of this.targets(taskIds).filter(
			(entry) => entry.isInMyDay(today) !== inMyDay,
		)) {
			this.updateTask(
				task.id,
				inMyDay ? { myDay: today, myDayDismissed: null } : { myDay: null, myDayDismissed: today },
			);
		}
	}

	setDueDayFor(taskIds: readonly string[], day: string | null): void {
		for (const task of this.targets(taskIds)) {
			this.setDueDay(task.id, day);
		}
	}

	moveTasks(taskIds: readonly string[], listId: string | null): void {
		for (const task of this.targets(taskIds).filter((entry) => entry.listId !== listId)) {
			this.moveTask(task.id, listId);
		}
	}

	deleteTasks(taskIds: readonly string[]): void {
		for (const task of this.targets(taskIds)) {
			this.deleteTask(task.id);
		}
	}

	createListFromTask(taskId: string): string | null {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task === undefined) {
			return null;
		}
		const listId = this.addList(task.title);
		for (const step of task.steps) {
			const created = Task.create(
				this.ids.next(),
				step.title,
				this.clock.now().toISOString(),
				listId,
			);
			this.insertTask(step.completed ? created.with({ completed: true }) : created);
		}
		this.deleteTask(taskId);
		return listId;
	}

	private targets(taskIds: readonly string[]): readonly Task[] {
		return this.get().tasks.filter((task) => taskIds.includes(task.id));
	}

	private insertTask(task: Task): void {
		this.commit((snapshot) => ({
			...snapshot,
			tasks: [...snapshot.tasks, task.data],
			outbox: this.enqueue(snapshot, {
				kind: "createTask",
				opId: this.ids.next(),
				task: task.data,
			}),
		}));
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

	addStep(taskId: string, title: string): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		const trimmed = title.trim();
		if (task !== undefined && trimmed.length > 0) {
			const step: TaskStepData = { id: this.ids.next(), title: trimmed, completed: false };
			this.updateTask(taskId, { steps: [...task.steps, step] });
		}
	}

	updateStep(taskId: string, stepId: string, changes: Partial<Omit<TaskStepData, "id">>): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task === undefined) {
			return;
		}
		const title = changes.title?.trim();
		if (title === "") {
			return;
		}
		this.updateTask(taskId, {
			steps: task.steps.map((step) =>
				step.id === stepId ? { ...step, ...changes, ...(title !== undefined && { title }) } : step,
			),
		});
	}

	deleteStep(taskId: string, stepId: string): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task !== undefined) {
			this.updateTask(taskId, { steps: task.steps.filter((step) => step.id !== stepId) });
		}
	}

	setNote(taskId: string, note: string): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task !== undefined && task.note !== note) {
			this.updateTask(taskId, { note });
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
				.discardSettings(listId)
				.enqueue({ kind: "deleteList", opId: this.ids.next(), listId });
			return {
				...snapshot,
				lists: snapshot.lists.filter((data) => data.id !== listId),
				settings: snapshot.settings.filter((entry) => entry.id !== listId),
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
}
