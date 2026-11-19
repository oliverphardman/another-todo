import { EntityId } from "../domain/entity-id";
import { NotFoundError, ValidationError } from "../domain/errors";
import type { TaskRepository } from "../domain/task-repository";
import { TodoList } from "../domain/todo-list";
import type { TodoListRepository } from "../domain/todo-list-repository";
import type { ViewSettingsRepository } from "../domain/view-settings-repository";
import type { Clock, IdGenerator } from "./ports";

export interface ListInput {
	readonly id?: unknown;
	readonly name?: unknown;
	readonly position?: unknown;
}

export class ListService {
	constructor(
		private readonly lists: TodoListRepository,
		private readonly tasks: TaskRepository,
		private readonly settings: ViewSettingsRepository,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async create(ownerId: string, input: ListInput): Promise<TodoList> {
		const id = input.id === undefined ? this.ids.next() : EntityId.parse(input.id);
		const existing = input.id === undefined ? null : await this.lists.findById(ownerId, id);
		if (existing !== null) {
			return existing;
		}
		const list = TodoList.create(ownerId, id, ListService.nameOf(input), this.clock.now());
		await this.lists.save(list);
		return list;
	}

	async get(ownerId: string, id: string): Promise<TodoList> {
		const list = await this.lists.findById(ownerId, id);
		if (list === null) {
			throw new NotFoundError(`List ${id} not found`);
		}
		return list;
	}

	async list(ownerId: string): Promise<TodoList[]> {
		const lists = await this.lists.list(ownerId);
		return lists.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
	}

	async update(ownerId: string, id: string, input: ListInput): Promise<TodoList> {
		if (input.name === undefined && input.position === undefined) {
			throw new ValidationError("name or position is required");
		}
		let list = await this.get(ownerId, id);
		if (input.name !== undefined) {
			list = list.rename(ListService.nameOf(input));
		}
		if (input.position !== undefined) {
			if (typeof input.position !== "number") {
				throw new ValidationError("position must be a number");
			}
			list = list.moveTo(input.position);
		}
		await this.lists.save(list);
		return list;
	}

	async delete(ownerId: string, id: string): Promise<void> {
		await this.get(ownerId, id);
		const tasks = await this.tasks.list(ownerId);
		for (const task of tasks.filter((candidate) => candidate.listId === id)) {
			await this.tasks.delete(ownerId, task.id);
		}
		await this.settings.delete(ownerId, id);
		await this.lists.delete(ownerId, id);
	}

	private static nameOf(input: ListInput): string {
		if (typeof input.name !== "string") {
			throw new ValidationError("name must be a string");
		}
		return input.name;
	}
}
