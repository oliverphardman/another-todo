import { DueDay } from "../domain/due-day";
import type { IdGenerator, Clock } from "../domain/ports";
import { Task, type TaskChanges } from "../domain/task";
import type { TodoStore } from "../state/todo-store";
import { LinkRepository, type Links, type ListLink, type TaskLink } from "./microsoft-links";
import {
	TaskSnapshot,
	type RemoteList,
	type RemoteTask,
	type RemoteTaskContent,
	type RemoteTodo,
} from "./remote-todo";

export interface SyncDirection {
	readonly receive: boolean;
	readonly send: boolean;
}

const BOTH_WAYS: SyncDirection = { receive: true, send: true };

interface SyncRun {
	readonly direction: SyncDirection;
	readonly previous: Links;
	readonly lists: Record<string, ListLink>;
	readonly tasks: Record<string, TaskLink>;
}

export class MicrosoftSyncEngine {
	constructor(
		private readonly store: TodoStore,
		private readonly remote: RemoteTodo,
		private readonly repository: LinkRepository,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async run(direction: SyncDirection = BOTH_WAYS): Promise<void> {
		const run: SyncRun = {
			direction,
			previous: await this.repository.load(),
			lists: {},
			tasks: {},
		};
		const remoteLists = await this.remote.lists();
		for (const remoteList of remoteLists) {
			const link = await this.syncList(remoteList, run);
			if (link === null) {
				continue;
			}
			run.lists[remoteList.id] = link;
			if (this.hasLocalList(link.local)) {
				await this.syncTasks(remoteList, link.local, run);
			} else {
				this.retainTasks(remoteList.id, run);
			}
		}
		this.removeListsDeletedRemotely(remoteLists, run);
		if (direction.send) {
			await this.createRemoteLists(run);
		}
		await this.repository.save({ lists: run.lists, tasks: run.tasks });
	}

	private hasLocalList(listId: string | null): boolean {
		return listId === null || this.store.get().lists.some((list) => list.id === listId);
	}

	private retainTasks(remoteListId: string, { previous, tasks }: SyncRun): void {
		for (const [remoteId, link] of Object.entries(previous.tasks)) {
			if (link.list === remoteListId) {
				tasks[remoteId] = link;
			}
		}
	}

	private async syncList(
		remoteList: RemoteList,
		{ direction, previous }: SyncRun,
	): Promise<ListLink | null> {
		const link = previous.lists[remoteList.id];
		if (link === undefined) {
			if (remoteList.isDefault) {
				return { local: null, name: remoteList.name };
			}
			return direction.receive
				? { local: this.store.importList(remoteList.name), name: remoteList.name }
				: null;
		}
		if (link.local === null) {
			return { local: null, name: remoteList.name };
		}
		const local = this.store.get().lists.find((list) => list.id === link.local);
		if (local === undefined) {
			if (!direction.send) {
				return link;
			}
			await this.remote.deleteList(remoteList.id);
			return null;
		}
		if (direction.receive && remoteList.name !== link.name) {
			this.store.renameList(local.id, remoteList.name);
			return { local: local.id, name: remoteList.name };
		}
		if (direction.send && local.name !== link.name) {
			await this.remote.renameList(remoteList.id, local.name);
			return { local: local.id, name: local.name };
		}
		return link;
	}

	private removeListsDeletedRemotely(remoteLists: readonly RemoteList[], run: SyncRun): void {
		const present = new Set(remoteLists.map((list) => list.id));
		for (const [remoteId, link] of Object.entries(run.previous.lists)) {
			if (present.has(remoteId) || link.local === null) {
				continue;
			}
			if (run.direction.receive) {
				this.store.deleteList(link.local);
			} else if (this.hasLocalList(link.local)) {
				run.lists[remoteId] = link;
				this.retainTasks(remoteId, run);
			}
		}
	}

	private async createRemoteLists(run: SyncRun): Promise<void> {
		const known = new Set([
			...Object.values(run.lists).map((link) => link.local),
			...Object.values(run.previous.lists).map((link) => link.local),
		]);
		for (const local of this.store
			.get()
			.lists.filter((list) => list.owned && !known.has(list.id))) {
			const created = await this.remote.createList(local.name);
			run.lists[created.id] = { local: local.id, name: local.name };
			await this.syncTasks(created, local.id, run);
		}
	}

	private async syncTasks(
		remoteList: RemoteList,
		localListId: string | null,
		run: SyncRun,
	): Promise<void> {
		const { direction, previous, tasks } = run;
		const remoteTasks = await this.remote.tasks(remoteList.id);
		const present = new Set(remoteTasks.map((task) => task.id));
		for (const remoteTask of remoteTasks) {
			const link = await this.syncTask(remoteList.id, localListId, remoteTask, run);
			if (link !== null) {
				tasks[remoteTask.id] = link;
			}
		}
		for (const [remoteId, link] of Object.entries(previous.tasks)) {
			if (link.list !== remoteList.id || present.has(remoteId)) {
				continue;
			}
			if (direction.receive) {
				this.store.deleteTask(link.local);
			} else if (this.store.get().tasks.some((task) => task.id === link.local)) {
				tasks[remoteId] = link;
			}
		}
		if (!direction.send) {
			return;
		}
		const linked = new Set(
			Object.values(tasks)
				.filter((link) => link.list === remoteList.id)
				.map((link) => link.local),
		);
		const known = new Set(
			Object.values(previous.tasks)
				.filter((link) => link.list === remoteList.id)
				.map((link) => link.local),
		);
		for (const local of this.store
			.get()
			.tasks.filter(
				(task) => task.listId === localListId && !linked.has(task.id) && !known.has(task.id),
			)) {
			const created = await this.remote.createTask(
				remoteList.id,
				MicrosoftSyncEngine.contentOf(local),
			);
			tasks[created.id] = {
				list: remoteList.id,
				local: local.id,
				base: TaskSnapshot.of(MicrosoftSyncEngine.contentOf(local)),
			};
		}
	}

	private async syncTask(
		remoteListId: string,
		localListId: string | null,
		remoteTask: RemoteTask,
		{ direction, previous }: SyncRun,
	): Promise<TaskLink | null> {
		const link = previous.tasks[remoteTask.id];
		const remoteContent = MicrosoftSyncEngine.remoteContent(remoteTask);
		const remoteSnapshot = TaskSnapshot.of(remoteContent);
		if (link === undefined) {
			if (!direction.receive) {
				return null;
			}
			const created = this.import(remoteContent, localListId);
			return { list: remoteListId, local: created, base: remoteSnapshot };
		}
		const local = this.store.get().tasks.find((task) => task.id === link.local);
		if (local === undefined) {
			if (!direction.send) {
				return link;
			}
			await this.remote.deleteTask(remoteListId, remoteTask.id);
			return null;
		}
		if (direction.receive && remoteSnapshot !== link.base) {
			this.store.updateTask(local.id, this.changes(remoteContent, local));
			return { ...link, base: remoteSnapshot };
		}
		const localContent = MicrosoftSyncEngine.contentOf(local);
		const localSnapshot = TaskSnapshot.of(localContent);
		if (direction.send && localSnapshot !== link.base) {
			await this.remote.updateTask(remoteListId, remoteTask, localContent);
			return { ...link, base: localSnapshot };
		}
		return link;
	}

	private import(content: RemoteTaskContent, listId: string | null): string {
		const created = Task.create(
			this.ids.next(),
			content.title,
			this.clock.now().toISOString(),
			listId,
		);
		return this.store.importTask(created.with(this.changes(content, created)));
	}

	private changes(content: RemoteTaskContent, existing: Task): TaskChanges {
		return {
			title: content.title,
			completed: content.completed,
			importance: content.important ? "high" : "normal",
			dueDate: content.dueDay === null ? null : DueDay.toIso(content.dueDay),
			note: content.note,
			steps: content.steps.map((step, index) => ({
				id: existing.steps[index]?.id ?? this.ids.next(),
				title: step.title,
				completed: step.completed,
			})),
		};
	}

	private static contentOf(task: Task): RemoteTaskContent {
		return {
			title: task.title,
			completed: task.completed,
			important: task.important,
			dueDay: task.dueDay,
			note: task.note,
			steps: task.steps.map((step) => ({ title: step.title, completed: step.completed })),
		};
	}

	private static remoteContent(task: RemoteTask): RemoteTaskContent {
		return {
			title: task.title,
			completed: task.completed,
			important: task.important,
			dueDay: task.dueDay,
			note: task.note,
			steps: task.steps.map((step) => ({ title: step.title, completed: step.completed })),
		};
	}
}
