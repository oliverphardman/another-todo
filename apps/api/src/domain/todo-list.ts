import { ValidationError } from "./errors";

export interface TodoListRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
}

export class TodoList {
	private constructor(
		readonly ownerId: string,
		readonly id: string,
		readonly name: string,
		readonly createdAt: Date,
	) {}

	static create(ownerId: string, id: string, name: string, createdAt: Date): TodoList {
		return new TodoList(ownerId, id, TodoList.validateName(name), createdAt);
	}

	static restore(record: TodoListRecord): TodoList {
		return new TodoList(record.ownerId, record.id, record.name, new Date(record.createdAt));
	}

	private static validateName(name: string): string {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			throw new ValidationError("List name must not be empty");
		}
		return trimmed;
	}

	rename(name: string): TodoList {
		return new TodoList(this.ownerId, this.id, TodoList.validateName(name), this.createdAt);
	}

	toRecord(): TodoListRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			name: this.name,
			createdAt: this.createdAt.toISOString(),
		};
	}

	toJSON(): Omit<TodoListRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
