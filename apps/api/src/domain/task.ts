export type Importance = "normal" | "high";

export interface TaskProps {
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly dueDate: Date | null;
	readonly createdAt: Date;
}

export class Task {
	private constructor(private readonly props: TaskProps) {}

	static create(id: string, title: string, createdAt: Date): Task {
		return new Task({
			id,
			title: Task.validateTitle(title),
			completed: false,
			importance: "normal",
			dueDate: null,
			createdAt,
		});
	}

	private static validateTitle(title: string): string {
		const trimmed = title.trim();
		if (trimmed.length === 0) {
			throw new Error("Task title must not be empty");
		}
		return trimmed;
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
}
