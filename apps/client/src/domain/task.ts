export type Importance = "normal" | "high";

export interface TaskData {
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly listId: string | null;
	readonly dueDate: string | null;
	readonly createdAt: string;
}

export interface TaskChanges {
	readonly title?: string;
	readonly completed?: boolean;
	readonly importance?: Importance;
	readonly listId?: string | null;
	readonly dueDate?: string | null;
}

export class Task {
	constructor(readonly data: TaskData) {}

	static create(id: string, title: string, createdAt: string, listId: string | null = null): Task {
		return new Task({
			id,
			title,
			completed: false,
			importance: "normal",
			listId,
			dueDate: null,
			createdAt,
		});
	}

	get id(): string {
		return this.data.id;
	}

	get title(): string {
		return this.data.title;
	}

	get completed(): boolean {
		return this.data.completed;
	}

	get important(): boolean {
		return this.data.importance === "high";
	}

	get listId(): string | null {
		return this.data.listId;
	}

	get dueDay(): string | null {
		return this.data.dueDate === null ? null : this.data.dueDate.slice(0, 10);
	}

	get dueSortKey(): string {
		return this.data.dueDate ?? "9999-12-31";
	}

	get createdAt(): string {
		return this.data.createdAt;
	}

	with(changes: TaskChanges): Task {
		return new Task({
			...this.data,
			...(changes.title !== undefined && { title: changes.title }),
			...(changes.completed !== undefined && { completed: changes.completed }),
			...(changes.importance !== undefined && {
				importance: changes.importance,
			}),
			...(changes.listId !== undefined && { listId: changes.listId }),
			...(changes.dueDate !== undefined && { dueDate: changes.dueDate }),
		});
	}
}
