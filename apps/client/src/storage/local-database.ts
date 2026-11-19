import type { TaskData } from "../domain/task";
import type { TodoListData } from "../domain/todo-list";
import { Observable } from "../state/observable";
import type { Operation } from "../sync/operation";
import type { KeyValueStore } from "./key-value-store";

export interface Snapshot {
	readonly version: 1;
	readonly lists: readonly TodoListData[];
	readonly tasks: readonly TaskData[];
	readonly outbox: readonly Operation[];
}

const STORAGE_KEY = "atd.snapshot";

export const EMPTY_SNAPSHOT: Snapshot = {
	version: 1,
	lists: [],
	tasks: [],
	outbox: [],
};

export class LocalDatabase extends Observable<Snapshot> {
	private writes: Promise<void> = Promise.resolve();

	constructor(private readonly store: KeyValueStore) {
		super(EMPTY_SNAPSHOT);
	}

	async load(): Promise<void> {
		const stored = await this.store.get(STORAGE_KEY);
		if (stored === null) {
			return;
		}
		try {
			const parsed = JSON.parse(stored) as Snapshot;
			if (parsed.version === 1) {
				this.set(parsed);
			}
		} catch {
			await this.store.remove(STORAGE_KEY);
		}
	}

	apply(mutation: (snapshot: Snapshot) => Snapshot): Promise<void> {
		this.set(mutation(this.get()));
		const serialized = JSON.stringify(this.get());
		this.writes = this.writes.then(() => this.store.set(STORAGE_KEY, serialized));
		return this.writes;
	}

	async clear(): Promise<void> {
		this.set(EMPTY_SNAPSHOT);
		this.writes = this.writes.then(() => this.store.remove(STORAGE_KEY));
		await this.writes;
	}
}
