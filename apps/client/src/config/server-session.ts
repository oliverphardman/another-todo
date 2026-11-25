import { Observable } from "../state/observable";
import { AppConfigReader, type AppConfig, type BuildConfig } from "./app-config";
import type { KeyValueStore } from "../storage/key-value-store";
import { LocalData } from "../storage/local-data";
import { ServerInfoLoader } from "./server-info";
import { ServerSettings } from "./server-settings";

export type ServerState =
	| { readonly status: "resolving" }
	| { readonly status: "needsUrl"; readonly invalid: boolean }
	| { readonly status: "unreachable"; readonly url: string }
	| { readonly status: "ready"; readonly config: AppConfig };

export interface ServerControls {
	readonly enforced: boolean;
	change(): Promise<void>;
	logOut(): Promise<void>;
}

export class ServerSession extends Observable<ServerState> implements ServerControls {
	constructor(
		private readonly build: BuildConfig,
		private readonly settings: ServerSettings,
		private readonly loader: ServerInfoLoader,
	) {
		super({ status: "resolving" });
	}

	get enforced(): boolean {
		return this.settings.enforced;
	}

	async start(): Promise<void> {
		const url = await this.settings.current();
		if (url === null) {
			this.set({ status: "needsUrl", invalid: false });
			return;
		}
		await this.connectTo(url);
	}

	async connect(input: string): Promise<void> {
		let url: string;
		try {
			url = await this.settings.choose(input);
		} catch {
			this.set({ status: "needsUrl", invalid: true });
			return;
		}
		await this.connectTo(url);
	}

	async retry(): Promise<void> {
		this.set({ status: "resolving" });
		await this.start();
	}

	async change(): Promise<void> {
		await this.settings.forget();
		this.set({ status: "needsUrl", invalid: false });
	}

	async logOut(): Promise<void> {
		this.set({ status: "needsUrl", invalid: false });
		await this.settings.logOut();
	}

	private async connectTo(url: string): Promise<void> {
		this.set({ status: "resolving" });
		try {
			const info = await this.loader.load(url);
			await this.settings.claim(url);
			this.set({ status: "ready", config: AppConfigReader.compose(this.build, url, info) });
		} catch {
			this.set({ status: "unreachable", url });
		}
	}
}

export class ServerSessions {
	static create(
		build: BuildConfig,
		data: KeyValueStore,
		tokens: KeyValueStore,
		loader: ServerInfoLoader = new ServerInfoLoader(),
	): ServerSession {
		return new ServerSession(
			build,
			new ServerSettings(data, build.enforcedServerUrl, () => LocalData.discard(data, tokens)),
			loader,
		);
	}
}
