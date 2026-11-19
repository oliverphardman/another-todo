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
	readonly dueDate: string | null;
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
			...(changes.myDay !== undefined && { myDay: changes.myDay }),
			...(changes.myDayDismissed !== undefined && { myDayDismissed: changes.myDayDismissed }),
			...(changes.steps !== undefined && { steps: changes.steps }),
			...(changes.note !== undefined && { note: changes.note }),
			...(changes.dueDate !== undefined && { dueDate: changes.dueDate }),
		});
	}
}
