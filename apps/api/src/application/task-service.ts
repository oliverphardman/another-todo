import { EntityId } from "../domain/entity-id";
import { NotFoundError, ValidationError } from "../domain/errors";
import { Task } from "../domain/task";
import type { TaskRepository } from "../domain/task-repository";
import type { TodoListRepository } from "../domain/todo-list-repository";
import type { Clock, IdGenerator } from "./ports";
import type { SharedAccess } from "./shared-access";
import { TaskChanges, type TaskInput } from "./task-changes";

export class TaskService {
	constructor(
		private readonly repository: TaskRepository,
		private readonly lists: TodoListRepository,
		private readonly access: SharedAccess,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async create(userId: string, input: TaskInput): Promise<Task> {
		if (input.title === undefined) {
			throw new ValidationError("title is required");
		}
		const id = input.id === undefined ? this.ids.next() : EntityId.parse(input.id);
		const ownerId = await this.ownerForInput(userId, input);
		const existing = input.id === undefined ? null : await this.repository.findById(ownerId, id);
		if (existing !== null) {
			return existing;
		}
		const created = Task.create(ownerId, id, TaskChanges.title(input.title), this.clock.now());
		const task = TaskChanges.apply(created, { ...input, id: undefined, title: undefined });
		await this.repository.save(task);
		return task;
	}

	async get(userId: string, id: string): Promise<Task> {
		const task = await this.locate(userId, id);
		if (task === null) {
			throw new NotFoundError(`Task ${id} not found`);
		}
		return task;
	}

	async list(userId: string, listId?: string): Promise<Task[]> {
		const tasks = (await this.repository.list(userId)).filter(
			(task) => listId === undefined || task.listId === listId,
		);
		for (const membership of await this.access.memberships(userId)) {
			if (listId === undefined || listId === membership.listId) {
				const shared = await this.repository.list(membership.listOwnerId);
				tasks.push(...shared.filter((task) => task.listId === membership.listId));
			}
		}
		return tasks.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
		);
	}

	async update(userId: string, id: string, input: TaskInput): Promise<Task> {
		const existing = await this.get(userId, id);
		if (input.listId !== undefined) {
			const target = await this.ownerForInput(userId, input);
			if (target !== existing.ownerId) {
				throw new ValidationError("A task cannot move between lists with different owners");
			}
		}
		const task = TaskChanges.apply(existing, input);
		await this.repository.save(task);
		return task;
	}

	async delete(userId: string, id: string): Promise<void> {
		const task = await this.get(userId, id);
		await this.repository.delete(task.ownerId, id);
	}

	private async locate(userId: string, id: string): Promise<Task | null> {
		const own = await this.repository.findById(userId, id);
		if (own !== null) {
			return own;
		}
		for (const membership of await this.access.memberships(userId)) {
			const shared = await this.repository.findById(membership.listOwnerId, id);
			if (shared !== null && shared.listId === membership.listId) {
				return shared;
			}
		}
		return null;
	}

	private async ownerForInput(userId: string, input: TaskInput): Promise<string> {
		const listId = input.listId === undefined ? null : TaskChanges.listId(input.listId);
		if (listId === null) {
			return userId;
		}
		if ((await this.lists.findById(userId, listId)) !== null) {
			return userId;
		}
		const membership = await this.access.membershipFor(userId, listId);
		if (
			membership === null ||
			(await this.lists.findById(membership.listOwnerId, listId)) === null
		) {
			throw new ValidationError(`List ${listId} does not exist`);
		}
		return membership.listOwnerId;
	}
}
