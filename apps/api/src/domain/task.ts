import { ValidationError } from "./errors";

export type Importance = "normal" | "high";

export interface TaskProps {
	readonly ownerId: string;
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly dueDate: Date | null;
	readonly createdAt: Date;
}

export interface TaskRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly dueDate: string | null;
	readonly createdAt: string;
}

export class Task {
	private constructor(private readonly props: TaskProps) {}

	static create(ownerId: string, id: string, title: string, createdAt: Date): Task {
		return new Task({
			ownerId,
			id,
			title: Task.validateTitle(title),
			completed: false,
			importance: "normal",
			dueDate: null,
			createdAt,
		});
	}

	static restore(record: TaskRecord): Task {
		return new Task({
			ownerId: record.ownerId,
			id: record.id,
			title: record.title,
			completed: record.completed,
			importance: record.importance,
			dueDate: record.dueDate === null ? null : new Date(record.dueDate),
			createdAt: new Date(record.createdAt),
		});
	}

	private static validateTitle(title: string): string {
		const trimmed = title.trim();
		if (trimmed.length === 0) {
			throw new ValidationError("Task title must not be empty");
		}
		return trimmed;
	}

	get ownerId(): string {
		return this.props.ownerId;
	}

	get id(): string {
		return this.props.id;
	}

	get title(): string {
		return this.props.title;
	}

	get completed(): boolean {
		return this.props.completed;
	}

	get importance(): Importance {
		return this.props.importance;
	}

	get dueDate(): Date | null {
		return this.props.dueDate;
	}

	get createdAt(): Date {
		return this.props.createdAt;
	}

	rename(title: string): Task {
		return new Task({ ...this.props, title: Task.validateTitle(title) });
	}

	complete(): Task {
		return new Task({ ...this.props, completed: true });
	}

	reopen(): Task {
		return new Task({ ...this.props, completed: false });
	}

	setImportance(importance: Importance): Task {
		return new Task({ ...this.props, importance });
	}

	setDueDate(dueDate: Date | null): Task {
		return new Task({ ...this.props, dueDate });
	}

	toRecord(): TaskRecord {
		return {
			ownerId: this.props.ownerId,
			id: this.props.id,
			title: this.props.title,
			completed: this.props.completed,
			importance: this.props.importance,
			dueDate: this.props.dueDate?.toISOString() ?? null,
			createdAt: this.props.createdAt.toISOString(),
		};
	}

	toJSON(): Omit<TaskRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
