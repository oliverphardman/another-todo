import type { Task } from "../domain/task";

export interface ExportedTask {
	readonly task: Task;
	readonly list: string;
	readonly group: string | null;
	readonly inMyDay: boolean;
}

export interface ExportedList {
	readonly name: string;
	readonly group: string | null;
	readonly subtitle: string | null;
	readonly tasks: readonly ExportedTask[];
}

export interface ExportDocument {
	readonly title: string;
	readonly today: string;
	readonly exportedAt: string;
	readonly lists: readonly ExportedList[];
}
