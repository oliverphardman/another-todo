export interface RemoteList {
	readonly id: string;
	readonly name: string;
	readonly isDefault: boolean;
}

export interface RemoteStep {
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
}

export interface RemoteTask {
	readonly id: string;
	readonly title: string;
	readonly completed: boolean;
	readonly important: boolean;
	readonly dueDay: string | null;
	readonly note: string;
	readonly steps: readonly RemoteStep[];
}

export interface RemoteTaskContent {
	readonly title: string;
	readonly completed: boolean;
	readonly important: boolean;
	readonly dueDay: string | null;
	readonly note: string;
	readonly steps: readonly { readonly title: string; readonly completed: boolean }[];
}

export interface RemoteTodo {
	lists(): Promise<RemoteList[]>;
	createList(name: string): Promise<RemoteList>;
	renameList(listId: string, name: string): Promise<void>;
	deleteList(listId: string): Promise<void>;
	tasks(listId: string): Promise<RemoteTask[]>;
	createTask(listId: string, content: RemoteTaskContent): Promise<RemoteTask>;
	updateTask(listId: string, task: RemoteTask, content: RemoteTaskContent): Promise<void>;
	deleteTask(listId: string, taskId: string): Promise<void>;
}

export class TaskSnapshot {
	static of(content: RemoteTaskContent): string {
		return JSON.stringify([
			content.title,
			content.completed,
			content.important,
			content.dueDay,
			content.note,
			content.steps.map((step) => [step.title, step.completed]),
		]);
	}
}
