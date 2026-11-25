import type { SoundPlayer } from "../audio/sound-player";
import { DueDay } from "../domain/due-day";
import type { Clock, IdGenerator } from "../domain/ports";
import { Recurrence, type RepeatRule } from "../domain/recurrence";
import { Task, type TaskChanges } from "../domain/task";
import { TaskSorter } from "../domain/task-sorter";
import type { TaskStepData } from "../domain/task-step";
import { Group } from "../domain/group";
import { SearchView, TaskView, ViewCatalog } from "../domain/task-view";
import { TodoList } from "../domain/todo-list";
import { ViewSettings, type ViewSettingsChanges } from "../domain/view-settings";
import type { LocalDatabase, Snapshot } from "../storage/local-database";
import { Outbox } from "../sync/outbox";
import type { Operation } from "../sync/operation";
import type { SyncTrigger } from "../sync/sync-coordinator";
import { Observable } from "./observable";

const DEFAULT_VIEW_ID = "my-day";
const POSITION_STEP = 1000;

export interface TodoState {
	readonly lists: readonly TodoList[];
	readonly groups: readonly Group[];
	readonly renamingGroupId: string | null;
	readonly tasks: readonly Task[];
	readonly views: readonly TaskView[];
	readonly settings: readonly ViewSettings[];
	readonly selectedViewId: string;
	readonly selectedTaskId: string | null;
	readonly selectedTaskIds: readonly string[];
	readonly anchorTaskId: string | null;
	readonly renamingViewId: string | null;
	readonly searchQuery: string;
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
			const {
				selectedViewId,
				selectedTaskIds,
				anchorTaskId,
				renamingViewId,
				renamingGroupId,
				searchQuery,
			} = this.get();
			this.set({
				...TodoStore.derive(
					database.get(),
					selectedViewId,
					selectedTaskIds,
					anchorTaskId,
					DueDay.fromDate(clock.now()),
				),
				renamingViewId,
				renamingGroupId,
				searchQuery,
			});
			if (this.get().tasks.some((task) => task.completed && task.repeat !== null)) {
				queueMicrotask(() => this.rollRepeats());
			}
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
			renamingGroupId: null,
			groups: snapshot.groups
				.map((data) => new Group(data))
				.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id)),
			searchQuery: "",
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
		const { views, selectedViewId, searchQuery } = this.get();
		if (searchQuery !== "") {
			return new SearchView(searchQuery);
		}
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
		const compare = TaskSorter.comparator(
			settings.sort,
			view.order,
			today,
			settings.sortDescending,
		);
		return {
			open: matching.filter((task) => !task.completed).sort(compare),
			done: settings.hideCompleted ? [] : matching.filter((task) => task.completed).sort(compare),
		};
	}

	reorderTask(taskId: string, index: number): void {
		const view = this.selectedView;
		if (this.settingsFor(view.id).sort !== null || view.order !== "newest") {
			return;
		}
		const ordered = this.visibleTasks().open;
		const current = ordered.findIndex((task) => task.id === taskId);
		if (current === -1) {
			return;
		}
		const others = ordered.filter((task) => task.id !== taskId);
		const target = Math.max(0, Math.min(index, others.length));
		if (target === current) {
			return;
		}
		const before = others[target - 1];
		const after = others[target];
		const position =
			before !== undefined && after !== undefined
				? (before.manualKey + after.manualKey) / 2
				: before !== undefined
					? before.manualKey + POSITION_STEP
					: after!.manualKey - POSITION_STEP;
		this.updateTask(taskId, { position });
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
			searchQuery: "",
			...TodoStore.selection([], null),
		});
	}

	search(query: string): void {
		this.set({ ...this.get(), searchQuery: query.trim(), ...TodoStore.selection([], null) });
	}

	startRenaming(listId: string): void {
		const known = this.get().views.some((view) => view.id === listId && view.canEditList);
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

	importTask(task: Task): string {
		this.insertTask(task);
		return task.id;
	}

	importList(name: string): string {
		const list = TodoList.create(this.ids.next(), name.trim(), this.clock.now().toISOString());
		this.commit((snapshot) => ({
			...snapshot,
			lists: [...snapshot.lists, list.data],
			outbox: this.enqueue(snapshot, {
				kind: "createList",
				opId: this.ids.next(),
				list: list.data,
			}),
		}));
		return list.id;
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

	rollRepeats(): void {
		const now = this.clock.now().toISOString();
		for (const task of this.get().tasks) {
			const next = task.nextOccurrence(this.today, now);
			if (next === null) {
				continue;
			}
			if (!this.get().tasks.some((other) => other.id === next.id)) {
				this.insertTask(next);
			}
			this.updateTask(task.id, { repeat: null });
		}
	}

	setRepeat(taskId: string, rule: RepeatRule | null): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task === undefined) {
			return;
		}
		if (rule === null) {
			this.updateTask(taskId, { repeat: null });
			return;
		}
		const due = new Recurrence(rule).firstOnOrAfter(task.dueDay ?? this.today);
		this.updateTask(taskId, {
			repeat: new Recurrence(rule).anchoredTo(due).rule,
			dueDate: DueDay.toIso(due),
		});
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
		if (changes.completed === true) {
			this.rollRepeats();
		}
	}

	renameTask(taskId: string, title: string): void {
		const trimmed = title.trim();
		if (trimmed.length > 0) {
			this.updateTask(taskId, { title: trimmed });
		}
	}

	announceCompleted(): void {
		this.sounds.playCompleted();
	}

	toggleCompleted(taskId: string, sound = true): void {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		if (task !== undefined) {
			if (!task.completed && sound) {
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

	promoteStep(taskId: string, stepId: string): string | null {
		const task = this.get().tasks.find((candidate) => candidate.id === taskId);
		const step = task?.steps.find((candidate) => candidate.id === stepId);
		if (task === undefined || step === undefined) {
			return null;
		}
		const promoted = Task.create(
			this.ids.next(),
			step.title,
			this.clock.now().toISOString(),
			task.listId,
		).with({
			completed: step.completed,
			importance: task.data.importance,
			myDay: task.data.myDay,
			myDayDismissed: task.data.myDayDismissed,
			dueDate: task.data.dueDate,
		});
		this.insertTask(promoted);
		this.deleteStep(taskId, stepId);
		return promoted.id;
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
		const repeat = this.get().tasks.find((task) => task.id === taskId)?.repeat ?? null;
		this.updateTask(taskId, {
			dueDate: day === null ? null : DueDay.toIso(day),
			...(repeat !== null && {
				repeat: day === null ? null : new Recurrence(repeat).anchoredTo(day).rule,
			}),
		});
	}

	setReminder(taskId: string, at: Date | null): void {
		this.updateTask(taskId, { remindAt: at === null ? null : at.toISOString() });
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

	addGroup(name: string): string | null {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			return null;
		}
		const group = Group.create(this.ids.next(), trimmed, this.clock.now().toISOString());
		this.commit((snapshot) => ({
			...snapshot,
			groups: [...snapshot.groups, group.data],
			outbox: this.enqueue(snapshot, {
				kind: "createGroup",
				opId: this.ids.next(),
				group: group.data,
			}),
		}));
		return group.id;
	}

	newGroup(name: string): string | null {
		const groupId = this.addGroup(name);
		if (groupId !== null) {
			this.startRenamingGroup(groupId);
		}
		return groupId;
	}

	createGroupFor(listId: string, name: string): string | null {
		if (!this.get().lists.some((list) => list.id === listId)) {
			return null;
		}
		const groupId = this.addGroup(name);
		if (groupId === null) {
			return null;
		}
		this.setListGroup(listId, groupId);
		this.set({ ...this.get(), renamingGroupId: groupId });
		return groupId;
	}

	setListGroup(listId: string, groupId: string | null): void {
		const list = this.get().lists.find((candidate) => candidate.id === listId);
		const known = groupId === null || this.get().groups.some((group) => group.id === groupId);
		if (list === undefined || !list.owned || !known || list.groupId === groupId) {
			return;
		}
		this.commit((snapshot) => ({
			...snapshot,
			lists: snapshot.lists.map((data) =>
				data.id === listId ? new TodoList(data).withGroup(groupId).data : data,
			),
			outbox: this.enqueue(snapshot, {
				kind: "setListGroup",
				opId: this.ids.next(),
				listId,
				groupId,
			}),
		}));
	}

	renameGroup(groupId: string, name: string): void {
		const trimmed = name.trim();
		if (trimmed.length === 0 || !this.get().groups.some((group) => group.id === groupId)) {
			return;
		}
		this.commit((snapshot) => ({
			...snapshot,
			groups: snapshot.groups.map((data) =>
				data.id === groupId ? new Group(data).rename(trimmed).data : data,
			),
			outbox: this.enqueue(snapshot, {
				kind: "renameGroup",
				opId: this.ids.next(),
				groupId,
				name: trimmed,
			}),
		}));
	}

	deleteGroup(groupId: string): void {
		if (!this.get().groups.some((group) => group.id === groupId)) {
			return;
		}
		this.commit((snapshot) => ({
			...snapshot,
			groups: snapshot.groups.filter((data) => data.id !== groupId),
			lists: snapshot.lists.map((data) =>
				data.groupId === groupId ? new TodoList(data).withGroup(null).data : data,
			),
			outbox: this.enqueue(snapshot, {
				kind: "deleteGroup",
				opId: this.ids.next(),
				groupId,
			}),
		}));
	}

	startRenamingGroup(groupId: string): void {
		if (this.get().groups.some((group) => group.id === groupId)) {
			this.set({ ...this.get(), renamingGroupId: groupId });
		}
	}

	stopRenamingGroup(): void {
		this.set({ ...this.get(), renamingGroupId: null });
	}

	renameList(listId: string, name: string): void {
		const trimmed = name.trim();
		if (
			trimmed.length === 0 ||
			!this.get().lists.some((list) => list.id === listId && list.owned)
		) {
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

	orderedLists(): readonly TodoList[] {
		return ViewCatalog.ordered(this.get().lists);
	}

	moveList(listId: string, index: number): void {
		const subject = this.get().lists.find((list) => list.id === listId);
		const ordered = this.orderedLists().filter((list) => list.groupId === subject?.groupId);
		const current = ordered.findIndex((list) => list.id === listId);
		if (current === -1 || !subject!.owned) {
			return;
		}
		const others = ordered.filter((list) => list.id !== listId);
		const target = Math.max(0, Math.min(index, others.length));
		if (target === current) {
			return;
		}
		const before = others[target - 1];
		const after = others[target];
		const position =
			before !== undefined && after !== undefined
				? (before.position + after.position) / 2
				: before !== undefined
					? before.position + POSITION_STEP
					: after!.position - POSITION_STEP;
		this.commit((snapshot) => ({
			...snapshot,
			lists: snapshot.lists.map((data) =>
				data.id === listId ? new TodoList(data).moveTo(position).data : data,
			),
			outbox: this.enqueue(snapshot, {
				kind: "moveList",
				opId: this.ids.next(),
				listId,
				position,
			}),
		}));
	}

	shiftList(listId: string, delta: number): void {
		const subject = this.get().lists.find((list) => list.id === listId);
		const current = this.orderedLists()
			.filter((list) => list.groupId === subject?.groupId)
			.findIndex((list) => list.id === listId);
		if (current !== -1) {
			this.moveList(listId, current + delta);
		}
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
