import type { KeyValueStore } from "../storage/key-value-store";

export interface ListLink {
	readonly local: string | null;
	readonly name: string;
}

export interface TaskLink {
	readonly list: string;
	readonly local: string;
	readonly base: string;
}

export interface Links {
	readonly lists: Readonly<Record<string, ListLink>>;
	readonly tasks: Readonly<Record<string, TaskLink>>;
}

export const NO_LINKS: Links = { lists: {}, tasks: {} };

const KEY = "atd.msLinks";

export class LinkRepository {
	constructor(private readonly storage: KeyValueStore) {}

	async load(): Promise<Links> {
		const stored = await this.storage.get(KEY);
		if (stored === null) {
			return NO_LINKS;
		}
		try {
			const parsed = JSON.parse(stored) as Partial<Links>;
			return { lists: parsed.lists ?? {}, tasks: parsed.tasks ?? {} };
		} catch {
			return NO_LINKS;
		}
	}

	save(links: Links): Promise<void> {
		return this.storage.set(KEY, JSON.stringify(links));
	}

	clear(): Promise<void> {
		return this.storage.remove(KEY);
	}
}
