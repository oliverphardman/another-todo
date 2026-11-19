import { ValidationError } from "../domain/errors";
import type { Importance, Task } from "../domain/task";

export interface TaskInput {
	readonly id?: unknown;
	readonly title?: unknown;
	readonly completed?: unknown;
	readonly importance?: unknown;
	readonly listId?: unknown;
	readonly myDay?: unknown;
	readonly myDayDismissed?: unknown;
	readonly dueDate?: unknown;
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
		if (input.dueDate !== undefined) {
			result = result.setDueDate(TaskChanges.dueDate(input.dueDate));
		}
		return result;
	}

	static title(value: unknown): string {
		if (typeof value !== "string") {
			throw new ValidationError("title must be a string");
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

	private static dueDate(value: unknown): Date | null {
		if (value === null) {
			return null;
		}
		const parsed = typeof value === "string" ? new Date(value) : new Date(Number.NaN);
		if (Number.isNaN(parsed.getTime())) {
			throw new ValidationError("dueDate must be an ISO 8601 date string or null");
		}
		return parsed;
	}
}
