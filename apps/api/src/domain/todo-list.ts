import { ValidationError } from "./errors";

export interface TodoListRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
	readonly position?: number;
	readonly groupId?: string | null;
}

interface ListFields {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly createdAt: Date;
	readonly position: number;
	readonly groupId: string | null;
}

export class TodoList {
	private constructor(private readonly fields: ListFields) {}

	static create(ownerId: string, id: string, name: string, createdAt: Date): TodoList {
		return new TodoList({
			ownerId,
			id,
			name: TodoList.validateName(name),
			createdAt,
			position: createdAt.getTime(),
			groupId: null,
		});
	}

	static restore(record: TodoListRecord): TodoList {
		const createdAt = new Date(record.createdAt);
		return new TodoList({
			ownerId: record.ownerId,
			id: record.id,
			name: record.name,
			createdAt,
			position: record.position ?? createdAt.getTime(),
			groupId: record.groupId ?? null,
		});
	}

	private static validateName(name: string): string {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			throw new ValidationError("List name must not be empty");
		}
		return trimmed;
	}

	get ownerId(): string {
		return this.fields.ownerId;
	}

	get id(): string {
		return this.fields.id;
	}

	get name(): string {
		return this.fields.name;
	}

	get createdAt(): Date {
		return this.fields.createdAt;
	}

	get position(): number {
		return this.fields.position;
	}

	get groupId(): string | null {
		return this.fields.groupId;
	}

	rename(name: string): TodoList {
		return new TodoList({ ...this.fields, name: TodoList.validateName(name) });
	}

	moveTo(position: number): TodoList {
		if (!Number.isFinite(position)) {
			throw new ValidationError("position must be a number");
		}
		return new TodoList({ ...this.fields, position });
	}

	assignToGroup(groupId: string | null): TodoList {
		return new TodoList({ ...this.fields, groupId });
	}

	toRecord(): TodoListRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			name: this.name,
			createdAt: this.createdAt.toISOString(),
			position: this.position,
			groupId: this.groupId,
		};
	}

	toJSON(): Omit<TodoListRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
