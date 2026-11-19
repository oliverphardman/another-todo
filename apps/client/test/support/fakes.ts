import type { SoundPlayer } from "../../src/audio/sound-player";
import type { ApiGateway } from "../../src/api/api-gateway";
import type { AuthorizationServer, IdentityProvider } from "../../src/auth/authorization-server";
import type { TokenSet } from "../../src/auth/token-set";
import type { Clock, IdGenerator } from "../../src/domain/ports";
import { Task, type TaskChanges, type TaskData } from "../../src/domain/task";
import type { TodoListData } from "../../src/domain/todo-list";
import type { Connectivity } from "../../src/state/connectivity";

export class FixedClock implements Clock {
	constructor(private current = new Date(2026, 10, 19, 12, 0, 0)) {}

	now(): Date {
		return this.current;
	}

	advance(ms: number): void {
		this.current = new Date(this.current.getTime() + ms);
	}
}

export class SequenceIds implements IdGenerator {
	private count = 0;

	next(): string {
		this.count += 1;
		return `id-${this.count}`;
	}
}

export class RecordingSoundPlayer implements SoundPlayer {
	plays = 0;

	playCompleted(): void {
		this.plays += 1;
	}
}

export class ManualConnectivity implements Connectivity {
	private readonly listeners = new Set<() => void>();

	constructor(private online = true) {}

	isOnline(): boolean {
		return this.online;
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	setOnline(online: boolean): void {
		this.online = online;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	get listenerCount(): number {
		return this.listeners.size;
	}
}

export class FakeGateway implements ApiGateway {
	lists: TodoListData[] = [];
	tasks: TaskData[] = [];
	calls: string[] = [];
	failure: Error | null = null;
	failOnce = new Map<string, Error>();

	private guard(name: string): void {
		this.calls.push(name);
		const once = this.failOnce.get(name);
		if (once !== undefined) {
			this.failOnce.delete(name);
			throw once;
		}
		if (this.failure !== null) {
			throw this.failure;
		}
	}

	async listLists(): Promise<TodoListData[]> {
		this.guard("listLists");
		return this.lists.map((list) => ({ ...list }));
	}

	async createList(list: TodoListData): Promise<void> {
		this.guard(`createList:${list.id}`);
		if (!this.lists.some((existing) => existing.id === list.id)) {
			this.lists.push({ ...list });
		}
	}

	async renameList(id: string, name: string): Promise<void> {
		this.guard(`renameList:${id}`);
		this.lists = this.lists.map((list) => (list.id === id ? { ...list, name } : list));
	}

	async deleteList(id: string): Promise<void> {
		this.guard(`deleteList:${id}`);
		this.lists = this.lists.filter((list) => list.id !== id);
		this.tasks = this.tasks.filter((task) => task.listId !== id);
	}

	async listTasks(): Promise<TaskData[]> {
		this.guard("listTasks");
		return this.tasks.map((task) => ({ ...task }));
	}

	async createTask(task: TaskData): Promise<void> {
		this.guard(`createTask:${task.id}`);
		if (!this.tasks.some((existing) => existing.id === task.id)) {
			this.tasks.push({ ...task });
		}
	}

	async updateTask(id: string, changes: TaskChanges): Promise<void> {
		this.guard(`updateTask:${id}`);
		this.tasks = this.tasks.map((task) =>
			task.id === id ? new Task(task).with(changes).data : task,
		);
	}

	async deleteTask(id: string): Promise<void> {
		this.guard(`deleteTask:${id}`);
		this.tasks = this.tasks.filter((task) => task.id !== id);
	}
}

export class FakeAuthorizationServer implements AuthorizationServer {
	authorizeResult: TokenSet | null = {
		accessToken: "access-1",
		refreshToken: "refresh-1",
		expiresAt: Date.now() + 3_600_000,
	};
	refreshResult: TokenSet | Error = {
		accessToken: "access-2",
		refreshToken: null,
		expiresAt: Date.now() + 3_600_000,
	};
	revokeError: Error | null = null;
	authorizeCalls: (IdentityProvider | undefined)[] = [];
	refreshCalls = 0;
	revoked: string[] = [];

	async authorize(provider?: IdentityProvider): Promise<TokenSet | null> {
		this.authorizeCalls.push(provider);
		return this.authorizeResult;
	}

	async refresh(): Promise<TokenSet> {
		this.refreshCalls += 1;
		if (this.refreshResult instanceof Error) {
			throw this.refreshResult;
		}
		return this.refreshResult;
	}

	async revoke(refreshToken: string): Promise<void> {
		this.revoked.push(refreshToken);
		if (this.revokeError !== null) {
			throw this.revokeError;
		}
	}
}

export function taskData(overrides: Partial<TaskData> & { id: string }): TaskData {
	return {
		title: `Task ${overrides.id}`,
		completed: false,
		importance: "normal",
		listId: null,
		myDay: null,
		myDayDismissed: null,
		steps: [],
		note: "",
		dueDate: null,
		createdAt: "2026-11-19T10:00:00.000Z",
		...overrides,
	};
}
