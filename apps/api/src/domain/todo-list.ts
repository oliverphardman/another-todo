import { ValidationError } from "./errors";

export interface TodoListRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
	readonly position?: number;
}

export class TodoList {
	private constructor(
		readonly ownerId: string,
		readonly id: string,
		readonly name: string,
		readonly createdAt: Date,
		readonly position: number,
	) {}

	static create(ownerId: string, id: string, name: string, createdAt: Date): TodoList {
		return new TodoList(ownerId, id, TodoList.validateName(name), createdAt, createdAt.getTime());
	}

	static restore(record: TodoListRecord): TodoList {
		const createdAt = new Date(record.createdAt);
		return new TodoList(
			record.ownerId,
			record.id,
			record.name,
			createdAt,
			record.position ?? createdAt.getTime(),
		);
	}

	private static validateName(name: string): string {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			throw new ValidationError("List name must not be empty");
		}
		return trimmed;
	}

	rename(name: string): TodoList {
		return new TodoList(
			this.ownerId,
			this.id,
			TodoList.validateName(name),
			this.createdAt,
			this.position,
		);
	}

	moveTo(position: number): TodoList {
		if (!Number.isFinite(position)) {
			throw new ValidationError("position must be a number");
		}
		return new TodoList(this.ownerId, this.id, this.name, this.createdAt, position);
	}

	toRecord(): TodoListRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			name: this.name,
			createdAt: this.createdAt.toISOString(),
			position: this.position,
		};
	}

	toJSON(): Omit<TodoListRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
