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

export class MicrosoftSyncEngine {
	constructor(
		private readonly store: TodoStore,
		private readonly remote: RemoteTodo,
		private readonly repository: LinkRepository,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async run(): Promise<void> {
		const lists: Record<string, ListLink> = {};
		const tasks: Record<string, TaskLink> = {};
		const previous = await this.repository.load();
		const remoteLists = await this.remote.lists();
		for (const remoteList of remoteLists) {
			const link = await this.syncList(remoteList, previous);
			if (link !== null) {
				lists[remoteList.id] = link;
				await this.syncTasks(remoteList, link.local, previous, tasks);
			}
		}
		this.removeListsDeletedRemotely(remoteLists, previous);
		await this.createRemoteLists(lists, tasks, previous);
		await this.repository.save({ lists, tasks });
	}

	private async syncList(remoteList: RemoteList, previous: Links): Promise<ListLink | null> {
		const link = previous.lists[remoteList.id];
		if (link === undefined) {
			return {
				local: remoteList.isDefault ? null : this.store.importList(remoteList.name),
				name: remoteList.name,
			};
		}
		if (link.local === null) {
			return { local: null, name: remoteList.name };
		}
		const local = this.store.get().lists.find((list) => list.id === link.local);
		if (local === undefined) {
			await this.remote.deleteList(remoteList.id);
			return null;
		}
		if (remoteList.name !== link.name) {
			this.store.renameList(local.id, remoteList.name);
			return { local: local.id, name: remoteList.name };
		}
		if (local.name !== link.name) {
			await this.remote.renameList(remoteList.id, local.name);
			return { local: local.id, name: local.name };
		}
		return link;
	}

	private removeListsDeletedRemotely(remoteLists: readonly RemoteList[], previous: Links): void {
		const present = new Set(remoteLists.map((list) => list.id));
		for (const [remoteId, link] of Object.entries(previous.lists)) {
			if (!present.has(remoteId) && link.local !== null) {
				this.store.deleteList(link.local);
			}
		}
	}

	private async createRemoteLists(
		lists: Record<string, ListLink>,
		tasks: Record<string, TaskLink>,
		previous: Links,
	): Promise<void> {
		const known = new Set([
			...Object.values(lists).map((link) => link.local),
			...Object.values(previous.lists).map((link) => link.local),
		]);
		for (const local of this.store
			.get()
			.lists.filter((list) => list.owned && !known.has(list.id))) {
			const created = await this.remote.createList(local.name);
			const link: ListLink = { local: local.id, name: local.name };
			lists[created.id] = link;
			await this.syncTasks(created, local.id, previous, tasks);
		}
	}

	private async syncTasks(
		remoteList: RemoteList,
		localListId: string | null,
		previous: Links,
		tasks: Record<string, TaskLink>,
	): Promise<void> {
		const remoteTasks = await this.remote.tasks(remoteList.id);
		const present = new Set(remoteTasks.map((task) => task.id));
		for (const remoteTask of remoteTasks) {
			const link = await this.syncTask(
				remoteList.id,
				localListId,
				remoteTask,
				previous.tasks[remoteTask.id],
			);
			if (link !== null) {
				tasks[remoteTask.id] = link;
			}
		}
		for (const [remoteId, link] of Object.entries(previous.tasks)) {
			if (link.list === remoteList.id && !present.has(remoteId)) {
				this.store.deleteTask(link.local);
			}
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
		link: TaskLink | undefined,
	): Promise<TaskLink | null> {
		const remoteContent = MicrosoftSyncEngine.remoteContent(remoteTask);
		const remoteSnapshot = TaskSnapshot.of(remoteContent);
		if (link === undefined) {
			const created = this.import(remoteContent, localListId);
			return { list: remoteListId, local: created, base: remoteSnapshot };
		}
		const local = this.store.get().tasks.find((task) => task.id === link.local);
		if (local === undefined) {
			await this.remote.deleteTask(remoteListId, remoteTask.id);
			return null;
		}
		if (remoteSnapshot !== link.base) {
			this.store.updateTask(local.id, this.changes(remoteContent, local));
			return { ...link, base: remoteSnapshot };
		}
		const localContent = MicrosoftSyncEngine.contentOf(local);
		const localSnapshot = TaskSnapshot.of(localContent);
		if (localSnapshot !== link.base) {
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
