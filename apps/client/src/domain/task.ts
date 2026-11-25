import { DueDay } from "./due-day";
import { Recurrence, type RepeatRule } from "./recurrence";
import type { TaskStepData } from "./task-step";

export type Importance = "normal" | "high";

export interface TaskData {
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly importance: Importance;
	readonly listId: string | null;
	readonly myDay: string | null;
	readonly myDayDismissed: string | null;
	readonly steps: readonly TaskStepData[];
	readonly note: string;
	readonly position?: number | null;
	readonly dueDate: string | null;
	readonly remindAt?: string | null;
	readonly repeat?: RepeatRule | null;
	readonly createdAt: string;
}

export interface TaskChanges {
	readonly title?: string;
	readonly completed?: boolean;
	readonly importance?: Importance;
	readonly listId?: string | null;
	readonly myDay?: string | null;
	readonly myDayDismissed?: string | null;
	readonly steps?: readonly TaskStepData[];
	readonly note?: string;
	readonly position?: number | null;
	readonly dueDate?: string | null;
	readonly remindAt?: string | null;
	readonly repeat?: RepeatRule | null;
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
			myDay: null,
			myDayDismissed: null,
			steps: [],
			note: "",
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

	get steps(): readonly TaskStepData[] {
		return this.data.steps ?? [];
	}

	get note(): string {
		return this.data.note ?? "";
	}

	get stepsCompleted(): number {
		return this.steps.filter((step) => step.completed).length;
	}

	isInMyDay(today: string): boolean {
		return (
			this.data.myDay === today || (this.dueDay === today && this.data.myDayDismissed !== today)
		);
	}

	get remindAt(): string | null {
		return this.data.remindAt ?? null;
	}

	get repeat(): RepeatRule | null {
		return this.data.repeat ?? null;
	}

	nextOccurrence(today: string, createdAt: string): Task | null {
		if (!this.completed || this.repeat === null) {
			return null;
		}
		const due = this.dueDay ?? today;
		const next = new Recurrence(this.repeat).upcoming(due, today);
		const series = this.id.replace(/-r\d{8}$/, "").slice(0, 54);
		return new Task({
			...this.data,
			id: `${series}-r${next.replaceAll("-", "")}`,
			completed: false,
			myDay: null,
			myDayDismissed: null,
			position: null,
			steps: this.steps.map((step) => ({ ...step, completed: false })),
			dueDate: DueDay.toIso(next),
			remindAt: this.reminderMovedBy(DueDay.daysBetween(due, next)),
			createdAt,
		});
	}

	private reminderMovedBy(days: number): string | null {
		if (this.remindAt === null) {
			return null;
		}
		const moved = new Date(this.remindAt);
		moved.setDate(moved.getDate() + days);
		return moved.toISOString();
	}

	get dueDay(): string | null {
		return this.data.dueDate === null ? null : this.data.dueDate.slice(0, 10);
	}

	get manualKey(): number {
		if (this.data.position !== undefined && this.data.position !== null) {
			return this.data.position;
		}
		const created = Date.parse(this.data.createdAt);
		return Number.isNaN(created) ? 0 : -created;
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
			...(changes.myDay !== undefined && { myDay: changes.myDay }),
			...(changes.myDayDismissed !== undefined && { myDayDismissed: changes.myDayDismissed }),
			...(changes.steps !== undefined && { steps: changes.steps }),
			...(changes.note !== undefined && { note: changes.note }),
			...(changes.position !== undefined && { position: changes.position }),
			...(changes.dueDate !== undefined && { dueDate: changes.dueDate }),
			...(changes.remindAt !== undefined && { remindAt: changes.remindAt }),
			...(changes.repeat !== undefined && { repeat: changes.repeat }),
		});
	}
}
