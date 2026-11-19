export interface TodoListData {
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
	readonly position?: number;
	readonly groupId?: string | null;
}

export class TodoList {
	constructor(readonly data: TodoListData) {}

	static create(id: string, name: string, createdAt: string): TodoList {
		return new TodoList({ id, name, createdAt, position: TodoList.epoch(createdAt) });
	}

	get id(): string {
		return this.data.id;
	}

	get name(): string {
		return this.data.name;
	}

	private static epoch(createdAt: string): number {
		const parsed = Date.parse(createdAt);
		return Number.isNaN(parsed) ? 0 : parsed;
	}

	get groupId(): string | null {
		return this.data.groupId ?? null;
	}

	withGroup(groupId: string | null): TodoList {
		return new TodoList({ ...this.data, groupId });
	}

	get position(): number {
		return this.data.position ?? TodoList.epoch(this.data.createdAt);
	}

	moveTo(position: number): TodoList {
		return new TodoList({ ...this.data, position });
	}

	rename(name: string): TodoList {
		return new TodoList({ ...this.data, name });
	}
}
