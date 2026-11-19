import { EntityId } from "../domain/entity-id";
import { NotFoundError, ValidationError } from "../domain/errors";
import { Group } from "../domain/group";
import type { GroupRepository } from "../domain/group-repository";
import type { TodoListRepository } from "../domain/todo-list-repository";
import type { Clock, IdGenerator } from "./ports";

export interface GroupInput {
	readonly id?: unknown;
	readonly name?: unknown;
	readonly position?: unknown;
}

export class GroupService {
	constructor(
		private readonly groups: GroupRepository,
		private readonly lists: TodoListRepository,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async create(ownerId: string, input: GroupInput): Promise<Group> {
		const id = input.id === undefined ? this.ids.next() : EntityId.parse(input.id);
		const existing = input.id === undefined ? null : await this.groups.findById(ownerId, id);
		if (existing !== null) {
			return existing;
		}
		const group = Group.create(ownerId, id, GroupService.nameOf(input), this.clock.now());
		await this.groups.save(group);
		return group;
	}

	async get(ownerId: string, id: string): Promise<Group> {
		const group = await this.groups.findById(ownerId, id);
		if (group === null) {
			throw new NotFoundError(`Group ${id} not found`);
		}
		return group;
	}

	async list(ownerId: string): Promise<Group[]> {
		const groups = await this.groups.list(ownerId);
		return groups.sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));
	}

	async update(ownerId: string, id: string, input: GroupInput): Promise<Group> {
		if (input.name === undefined && input.position === undefined) {
			throw new ValidationError("name or position is required");
		}
		let group = await this.get(ownerId, id);
		if (input.name !== undefined) {
			group = group.rename(GroupService.nameOf(input));
		}
		if (input.position !== undefined) {
			if (typeof input.position !== "number") {
				throw new ValidationError("position must be a number");
			}
			group = group.moveTo(input.position);
		}
		await this.groups.save(group);
		return group;
	}

	async delete(ownerId: string, id: string): Promise<void> {
		await this.get(ownerId, id);
		for (const list of (await this.lists.list(ownerId)).filter((entry) => entry.groupId === id)) {
			await this.lists.save(list.assignToGroup(null));
		}
		await this.groups.delete(ownerId, id);
	}

	private static nameOf(input: GroupInput): string {
		if (typeof input.name !== "string") {
			throw new ValidationError("name must be a string");
		}
		return input.name;
	}
}
