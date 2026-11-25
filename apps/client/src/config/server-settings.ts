import type { KeyValueStore } from "../storage/key-value-store";

const SERVER_KEY = "atd.serverUrl";
const OWNER_KEY = "atd.dataServer";

export class InvalidServerUrlError extends Error {}

export class ServerSettings {
	constructor(
		private readonly store: KeyValueStore,
		readonly enforcedUrl: string | null,
		private readonly discardLocalData: () => Promise<void>,
	) {}

	get enforced(): boolean {
		return this.enforcedUrl !== null;
	}

	async current(): Promise<string | null> {
		return this.enforcedUrl ?? (await this.store.get(SERVER_KEY));
	}

	async choose(input: string): Promise<string> {
		const url = ServerSettings.normalize(input);
		await this.store.set(SERVER_KEY, url);
		return url;
	}

	async forget(): Promise<void> {
		await this.store.remove(SERVER_KEY);
	}

	async logOut(): Promise<void> {
		await this.forget();
		await this.discardLocalData();
		await this.store.set(OWNER_KEY, "");
	}

	async claim(url: string): Promise<void> {
		const owner = await this.store.get(OWNER_KEY);
		if (owner !== null && owner !== url) {
			await this.discardLocalData();
		}
		await this.store.set(OWNER_KEY, url);
	}

	static normalize(input: string): string {
		const text = input.trim();
		const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
		try {
			const url = new URL(candidate);
			if (url.protocol !== "https:" && url.protocol !== "http:") {
				throw new InvalidServerUrlError(input);
			}
			return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
		} catch {
			throw new InvalidServerUrlError(input);
		}
	}
}
