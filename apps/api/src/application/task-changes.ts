import { EntityId } from "../domain/entity-id";
import { ValidationError } from "../domain/errors";
import { FREQUENCIES, type Frequency, type Recurrence } from "../domain/recurrence";
import type { TaskStep } from "../domain/task-step";
import type { Importance, Task } from "../domain/task";

export interface TaskInput {
	readonly id?: unknown;
	readonly title?: unknown;
	readonly completed?: unknown;
	readonly importance?: unknown;
	readonly listId?: unknown;
	readonly myDay?: unknown;
	readonly myDayDismissed?: unknown;
	readonly position?: unknown;
	readonly steps?: unknown;
	readonly note?: unknown;
	readonly dueDate?: unknown;
	readonly remindAt?: unknown;
	readonly repeat?: unknown;
}

export class TaskChanges {
	static apply(task: Task, input: TaskInput): Task {
		let result = task;
		if (input.title !== undefined) {
			result = result.rename(TaskChanges.title(input.title));
		}
		if (input.completed !== undefined) {
			result = TaskChanges.completed(input.completed) ? result.complete() : result.reopen();
		}
		if (input.importance !== undefined) {
			result = result.setImportance(TaskChanges.importance(input.importance));
		}
		if (input.listId !== undefined) {
			result = result.setList(TaskChanges.listId(input.listId));
		}
		if (input.myDay !== undefined) {
			result = result.setMyDay(TaskChanges.day(input.myDay, "myDay"));
		}
		if (input.myDayDismissed !== undefined) {
			result = result.setMyDayDismissed(TaskChanges.day(input.myDayDismissed, "myDayDismissed"));
		}
		if (input.position !== undefined) {
			result = result.setPosition(TaskChanges.position(input.position));
		}
		if (input.steps !== undefined) {
			result = result.setSteps(TaskChanges.steps(input.steps));
		}
		if (input.note !== undefined) {
			result = result.setNote(TaskChanges.note(input.note));
		}
		if (input.dueDate !== undefined) {
			result = result.setDueDate(TaskChanges.instant(input.dueDate, "dueDate"));
		}
		if (input.remindAt !== undefined) {
			result = result.setRemindAt(TaskChanges.instant(input.remindAt, "remindAt"));
		}
		if (input.repeat !== undefined) {
			result = result.setRepeat(TaskChanges.repeat(input.repeat));
		}
		return result;
	}

	static repeat(value: unknown): Recurrence | null {
		if (value === null) {
			return null;
		}
		const { frequency, weekdays, monthDay } = Object(value) as Record<string, unknown>;
		if (!FREQUENCIES.includes(frequency as Frequency)) {
			throw new ValidationError(`repeat.frequency must be one of ${FREQUENCIES.join(", ")}`);
		}
		if (frequency === "weekly") {
			return { frequency, weekdays: TaskChanges.weekdays(weekdays) };
		}
		if (frequency === "daily" || monthDay === undefined) {
			return { frequency: frequency as Frequency };
		}
		if (!TaskChanges.isWhole(monthDay, 1, 31)) {
			throw new ValidationError("repeat.monthDay must be a day from 1 to 31");
		}
		return { frequency: frequency as Frequency, monthDay };
	}

	private static weekdays(value: unknown): number[] {
		if (
			!Array.isArray(value) ||
			value.length === 0 ||
			!value.every((day) => TaskChanges.isWhole(day, 0, 6))
		) {
			throw new ValidationError("a weekly repeat needs weekdays from 0 (Sunday) to 6 (Saturday)");
		}
		return [...new Set(value as number[])].sort((a, b) => a - b);
	}

	private static isWhole(value: unknown, from: number, to: number): value is number {
		return Number.isInteger(value) && (value as number) >= from && (value as number) <= to;
	}

	static title(value: unknown): string {
		if (typeof value !== "string") {
			throw new ValidationError("title must be a string");
		}
		return value;
	}

	static position(value: unknown): number | null {
		if (value === null) {
			return null;
		}
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new ValidationError("position must be a number or null");
		}
		return value;
	}

	static listId(value: unknown): string | null {
		if (value === null) {
			return null;
		}
		if (typeof value !== "string" || value.length === 0) {
			throw new ValidationError("listId must be a non-empty string or null");
		}
		return value;
	}

	static day(value: unknown, field: string): string | null {
		if (value === null) {
			return null;
		}
		if (
			typeof value !== "string" ||
			!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
			!new Date(`${value}T00:00:00.000Z`).toISOString().startsWith(value)
		) {
			throw new ValidationError(`${field} must be a YYYY-MM-DD date or null`);
		}
		return value;
	}

	static steps(value: unknown): TaskStep[] {
		if (!Array.isArray(value) || value.length > 100) {
			throw new ValidationError("steps must be an array of at most 100 steps");
		}
		return value.map((item: unknown) => {
			const { id, title, completed } = (item ?? {}) as Record<string, unknown>;
			if (typeof title !== "string" || title.trim().length === 0 || title.length > 256) {
				throw new ValidationError("a step title must be 1 to 256 characters");
			}
			if (typeof completed !== "boolean") {
				throw new ValidationError("a step's completed must be a boolean");
			}
			return { id: EntityId.parse(id), title: title.trim(), completed };
		});
	}

	static note(value: unknown): string {
		if (typeof value !== "string" || value.length > 10000) {
			throw new ValidationError("note must be a string of at most 10000 characters");
		}
		return value;
	}

	private static completed(value: unknown): boolean {
		if (typeof value !== "boolean") {
			throw new ValidationError("completed must be a boolean");
		}
		return value;
	}

	private static importance(value: unknown): Importance {
		if (value !== "normal" && value !== "high") {
			throw new ValidationError("importance must be normal or high");
		}
		return value;
	}

	private static instant(value: unknown, name: string): Date | null {
		if (value === null) {
			return null;
		}
		const parsed = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
		if (Number.isNaN(parsed.getTime())) {
			throw new ValidationError(`${name} must be an ISO 8601 date string or null`);
		}
		return parsed;
	}
}
