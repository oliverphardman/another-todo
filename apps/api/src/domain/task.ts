import { ValidationError } from "./errors";
import type { TaskStep } from "./task-step";

export type Importance = "normal" | "high";

export interface TaskProps {
	readonly ownerId: string;
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly listId: string | null;
	readonly myDay: string | null;
	readonly myDayDismissed: string | null;
	readonly steps: readonly TaskStep[];
	readonly note: string;
	readonly dueDate: Date | null;
	readonly createdAt: Date;
}

export interface TaskRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly listId?: string | null;
	readonly myDay?: string | null;
	readonly myDayDismissed?: string | null;
	readonly steps?: readonly TaskStep[];
	readonly note?: string;
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
			listId: null,
			myDay: null,
			myDayDismissed: null,
			steps: [],
			note: "",
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
			listId: record.listId ?? null,
			myDay: record.myDay ?? null,
			myDayDismissed: record.myDayDismissed ?? null,
			steps: record.steps ?? [],
			note: record.note ?? "",
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

	get listId(): string | null {
		return this.props.listId;
	}

	get myDay(): string | null {
		return this.props.myDay;
	}

	get myDayDismissed(): string | null {
		return this.props.myDayDismissed;
	}

	get steps(): readonly TaskStep[] {
		return this.props.steps;
	}

	get note(): string {
		return this.props.note;
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

	setList(listId: string | null): Task {
		return new Task({ ...this.props, listId });
	}

	setMyDay(myDay: string | null): Task {
		return new Task({ ...this.props, myDay });
	}

	setMyDayDismissed(myDayDismissed: string | null): Task {
		return new Task({ ...this.props, myDayDismissed });
	}

	setSteps(steps: readonly TaskStep[]): Task {
		return new Task({ ...this.props, steps });
	}

	setNote(note: string): Task {
		return new Task({ ...this.props, note });
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
			listId: this.props.listId,
			myDay: this.props.myDay,
			myDayDismissed: this.props.myDayDismissed,
			steps: this.props.steps,
			note: this.props.note,
			dueDate: this.props.dueDate?.toISOString() ?? null,
			createdAt: this.props.createdAt.toISOString(),
		};
	}

	toJSON(): Omit<TaskRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
