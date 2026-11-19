export interface TodoListData {
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
}

export class TodoList {
	constructor(readonly data: TodoListData) {}

	static create(id: string, name: string, createdAt: string): TodoList {
		return new TodoList({ id, name, createdAt });
	}

	get id(): string {
		return this.data.id;
	}

	get name(): string {
		return this.data.name;
	}

	rename(name: string): TodoList {
		return new TodoList({ ...this.data, name });
	}
}
