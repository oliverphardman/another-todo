import type {
	MicrosoftAuthorizer,
	MicrosoftTokens,
} from "../../src/microsoft/microsoft-authorizer";
import type {
	RemoteList,
	RemoteStep,
	RemoteTask,
	RemoteTaskContent,
	RemoteTodo,
} from "../../src/microsoft/remote-todo";

export class FakeRemoteTodo implements RemoteTodo {
	listsById = new Map<string, RemoteList>();
	tasksByList = new Map<string, RemoteTask[]>();
	calls: string[] = [];
	failure: Error | null = null;
	private counter = 0;

	constructor() {
		this.listsById.set("ms-default", { id: "ms-default", name: "Tasks", isDefault: true });
		this.tasksByList.set("ms-default", []);
	}

	addList(name: string): RemoteList {
		const list = { id: `ms-list-${++this.counter}`, name, isDefault: false };
		this.listsById.set(list.id, list);
		this.tasksByList.set(list.id, []);
		return list;
	}

	addTask(listId: string, changes: Partial<RemoteTask> = {}): RemoteTask {
		const task: RemoteTask = {
			id: `ms-task-${++this.counter}`,
			title: "Remote",
			completed: false,
			important: false,
			dueDay: null,
			note: "",
			steps: [],
			...changes,
		};
		this.tasksByList.get(listId)!.push(task);
		return task;
	}

	private guard(call: string): void {
		this.calls.push(call);
		if (this.failure !== null) {
			throw this.failure;
		}
	}

	async lists(): Promise<RemoteList[]> {
		this.guard("lists");
		return [...this.listsById.values()];
	}

	async createList(name: string): Promise<RemoteList> {
		this.guard(`createList:${name}`);
		return this.addList(name);
	}

	async renameList(listId: string, name: string): Promise<void> {
		this.guard(`renameList:${listId}:${name}`);
		this.listsById.set(listId, { ...this.listsById.get(listId)!, name });
	}

	async deleteList(listId: string): Promise<void> {
		this.guard(`deleteList:${listId}`);
		this.listsById.delete(listId);
		this.tasksByList.delete(listId);
	}

	async tasks(listId: string): Promise<RemoteTask[]> {
		this.guard(`tasks:${listId}`);
		return [...(this.tasksByList.get(listId) ?? [])];
	}

	async createTask(listId: string, content: RemoteTaskContent): Promise<RemoteTask> {
		this.guard(`createTask:${listId}:${content.title}`);
		return this.addTask(listId, FakeRemoteTodo.fromContent(content));
	}

	async updateTask(listId: string, task: RemoteTask, content: RemoteTaskContent): Promise<void> {
		this.guard(`updateTask:${listId}:${task.id}`);
		const tasks = this.tasksByList.get(listId)!;
		const index = tasks.findIndex((entry) => entry.id === task.id);
		tasks[index] = { ...task, ...FakeRemoteTodo.fromContent(content) };
	}

	async deleteTask(listId: string, taskId: string): Promise<void> {
		this.guard(`deleteTask:${listId}:${taskId}`);
		this.tasksByList.set(
			listId,
			this.tasksByList.get(listId)!.filter((task) => task.id !== taskId),
		);
	}

	private static fromContent(content: RemoteTaskContent): Partial<RemoteTask> {
		const steps: RemoteStep[] = content.steps.map((step, index) => ({
			id: `step-${index}`,
			title: step.title,
			completed: step.completed,
		}));
		return { ...content, steps };
	}
}

export class FakeMicrosoftAuthorizer implements MicrosoftAuthorizer {
	available = true;
	result: MicrosoftTokens | null = {
		accessToken: "ms-access",
		refreshToken: "ms-refresh",
		expiresAt: Date.now() + 3_600_000,
	};
	refreshed: MicrosoftTokens | Error = {
		accessToken: "ms-access-2",
		refreshToken: null,
		expiresAt: Date.now() + 3_600_000,
	};
	authorizeCalls = 0;
	refreshCalls: string[] = [];

	async authorize(): Promise<MicrosoftTokens | null> {
		this.authorizeCalls += 1;
		return this.result;
	}

	async refresh(refreshToken: string): Promise<MicrosoftTokens> {
		this.refreshCalls.push(refreshToken);
		if (this.refreshed instanceof Error) {
			throw this.refreshed;
		}
		return this.refreshed;
	}
}

export function microsoftAccessToken(username = "Microsoft_abc123"): string {
	const encode = (value: unknown) =>
		btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	return `${encode({ alg: "none" })}.${encode({ username })}.signature`;
}
