import { NotFoundError, ValidationError } from "../domain/errors";
import { Task } from "../domain/task";
import type { TaskRepository } from "../domain/task-repository";
import type { TodoListRepository } from "../domain/todo-list-repository";
import type { Clock, IdGenerator } from "./ports";
import { TaskChanges, type TaskInput } from "./task-changes";

export class TaskService {
	constructor(
		private readonly repository: TaskRepository,
		private readonly lists: TodoListRepository,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async create(ownerId: string, input: TaskInput): Promise<Task> {
		if (input.title === undefined) {
			throw new ValidationError("title is required");
		}
		await this.ensureListExists(ownerId, input);
		const created = Task.create(
			ownerId,
			this.ids.next(),
			TaskChanges.title(input.title),
			this.clock.now(),
		);
		const task = TaskChanges.apply(created, { ...input, title: undefined });
		await this.repository.save(task);
		return task;
	}

	async get(ownerId: string, id: string): Promise<Task> {
		const task = await this.repository.findById(ownerId, id);
		if (task === null) {
			throw new NotFoundError(`Task ${id} not found`);
		}
		return task;
	}

	async list(ownerId: string, listId?: string): Promise<Task[]> {
		const tasks = await this.repository.list(ownerId);
		return tasks
			.filter((task) => listId === undefined || task.listId === listId)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
	}

	async update(ownerId: string, id: string, input: TaskInput): Promise<Task> {
		const existing = await this.get(ownerId, id);
		await this.ensureListExists(ownerId, input);
		const task = TaskChanges.apply(existing, input);
		await this.repository.save(task);
		return task;
	}

	async delete(ownerId: string, id: string): Promise<void> {
		await this.get(ownerId, id);
		await this.repository.delete(ownerId, id);
	}

	private async ensureListExists(ownerId: string, input: TaskInput): Promise<void> {
		const listId = input.listId === undefined ? null : TaskChanges.listId(input.listId);
		if (listId !== null && (await this.lists.findById(ownerId, listId)) === null) {
			throw new ValidationError(`List ${listId} does not exist`);
		}
	}
}
