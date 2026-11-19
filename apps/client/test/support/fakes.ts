import type { GroupData } from "../../src/domain/group";
import type { SocketLike } from "../../src/sync/realtime-client";
import type { PhotoData, PickedPhoto } from "../../src/photos/photo";
import type { PhotoGateway, PhotoPicker } from "../../src/photos/photo-gateway";
import type { ListPrinter } from "../../src/print/list-print-document";
import type { SoundPlayer } from "../../src/audio/sound-player";
import type { ApiGateway } from "../../src/api/api-gateway";
import type { AuthorizationServer, IdentityProvider } from "../../src/auth/authorization-server";
import type { TokenSet } from "../../src/auth/token-set";
import type { Clock, IdGenerator } from "../../src/domain/ports";
import { Task, type TaskChanges, type TaskData } from "../../src/domain/task";
import type { TodoListData } from "../../src/domain/todo-list";
import type { ViewSettingsData } from "../../src/domain/view-settings";
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

export class RecordingPrinter implements ListPrinter {
	documents: string[] = [];
	failure: Error | null = null;

	async print(html: string): Promise<void> {
		this.documents.push(html);
		if (this.failure !== null) {
			throw this.failure;
		}
	}
}

export class FakePhotoGateway implements PhotoGateway {
	photos: PhotoData[] = [];
	failure: Error | null = null;
	calls: string[] = [];
	private counter = 0;

	async list(): Promise<PhotoData[]> {
		this.calls.push("list");
		if (this.failure !== null) {
			throw this.failure;
		}
		return this.photos.map((photo) => ({ ...photo }));
	}

	async create(picked: PickedPhoto): Promise<PhotoData> {
		this.calls.push("create");
		if (this.failure !== null) {
			throw this.failure;
		}
		this.counter += 1;
		const photo: PhotoData = {
			id: `photo-${this.counter}`,
			name: picked.name,
			contentType: picked.contentType,
			size: picked.size,
			createdAt: "2026-11-19T10:00:00.000Z",
			url: `https://photos.test/photo-${this.counter}`,
		};
		this.photos = [...this.photos, photo];
		return photo;
	}

	async remove(id: string): Promise<void> {
		this.calls.push("remove");
		if (this.failure !== null) {
			throw this.failure;
		}
		this.photos = this.photos.filter((photo) => photo.id !== id);
	}
}

export class FakePhotoPicker implements PhotoPicker {
	next: PickedPhoto | null | Error = {
		name: "beach.png",
		contentType: "image/png",
		size: 1000,
		body: new Blob(["x"]),
	};

	async pick(): Promise<PickedPhoto | null> {
		if (this.next instanceof Error) {
			throw this.next;
		}
		return this.next;
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
	groups: GroupData[] = [];
	tasks: TaskData[] = [];
	settings: ViewSettingsData[] = [];
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

	async listGroups(): Promise<GroupData[]> {
		this.guard("listGroups");
		return this.groups.map((group) => ({ ...group }));
	}

	async createGroup(group: GroupData): Promise<void> {
		this.guard(`createGroup:${group.id}`);
		if (!this.groups.some((existing) => existing.id === group.id)) {
			this.groups.push({ ...group });
		}
	}

	async renameGroup(id: string, name: string): Promise<void> {
		this.guard(`renameGroup:${id}`);
		this.groups = this.groups.map((group) => (group.id === id ? { ...group, name } : group));
	}

	async deleteGroup(id: string): Promise<void> {
		this.guard(`deleteGroup:${id}`);
		this.groups = this.groups.filter((group) => group.id !== id);
		this.lists = this.lists.map((list) =>
			list.groupId === id ? { ...list, groupId: null } : list,
		);
	}

	async setListGroup(listId: string, groupId: string | null): Promise<void> {
		this.guard(`setListGroup:${listId}`);
		this.lists = this.lists.map((list) => (list.id === listId ? { ...list, groupId } : list));
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

	async moveList(id: string, position: number): Promise<void> {
		this.guard(`moveList:${id}`);
		this.lists = this.lists.map((list) => (list.id === id ? { ...list, position } : list));
	}

	async deleteList(id: string): Promise<void> {
		this.guard(`deleteList:${id}`);
		this.lists = this.lists.filter((list) => list.id !== id);
		this.tasks = this.tasks.filter((task) => task.listId !== id);
	}

	async listSettings(): Promise<ViewSettingsData[]> {
		this.guard("listSettings");
		return this.settings.map((entry) => ({ ...entry }));
	}

	async putSettings(settings: ViewSettingsData): Promise<void> {
		this.guard(`putSettings:${settings.id}`);
		this.settings = [...this.settings.filter((entry) => entry.id !== settings.id), { ...settings }];
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

export class FakeSocket implements SocketLike {
	onopen: (() => void) | null = null;
	onmessage: ((event: { readonly data: unknown }) => void) | null = null;
	onclose: (() => void) | null = null;
	onerror: (() => void) | null = null;
	sent: string[] = [];
	closed = false;

	constructor(readonly url: string) {}

	send(data: string): void {
		this.sent.push(data);
	}

	close(): void {
		this.closed = true;
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
