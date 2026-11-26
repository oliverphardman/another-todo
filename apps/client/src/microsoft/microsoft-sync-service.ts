import type { AuthenticationService } from "../auth/authentication-service";
import type { Connectivity } from "../state/connectivity";
import { Observable } from "../state/observable";
import type { KeyValueStore } from "../storage/key-value-store";
import type { MicrosoftAuthorizer } from "./microsoft-authorizer";
import { MicrosoftIdentity } from "./microsoft-identity";
import type { LinkRepository } from "./microsoft-links";
import type { MicrosoftSession } from "./microsoft-session";
import type { MicrosoftSyncEngine } from "./microsoft-sync-engine";

export type MicrosoftSyncStatus =
	"unavailable" | "idle" | "offered" | "connected" | "syncing" | "failed";

const PREFS_KEY = "atd.msPrefs";
const INTERVAL_MS = 120_000;

type Decision = "enabled" | "declined";

export class MicrosoftSyncService extends Observable<MicrosoftSyncStatus> {
	private timer: ReturnType<typeof setInterval> | null = null;
	private running = false;

	constructor(
		private readonly auth: AuthenticationService,
		private readonly authorizer: MicrosoftAuthorizer,
		private readonly session: MicrosoftSession,
		private readonly engine: MicrosoftSyncEngine,
		private readonly links: LinkRepository,
		private readonly preferences: KeyValueStore,
		private readonly connectivity: Connectivity,
	) {
		super(authorizer.available ? "idle" : "unavailable");
	}

	get connected(): boolean {
		const status = this.get();
		return status === "connected" || status === "syncing" || status === "failed";
	}

	async start(): Promise<void> {
		if (!this.authorizer.available || this.auth.get() !== "signedIn") {
			return;
		}
		const decision = (await this.preferences.get(PREFS_KEY)) as Decision | null;
		if (decision === "enabled" && (await this.session.restore())) {
			this.set("connected");
			this.schedule();
			await this.syncNow();
		} else if (
			decision === null &&
			MicrosoftIdentity.isMicrosoftAccount(await this.auth.getAccessToken())
		) {
			this.set("offered");
		}
	}

	watch(): () => void {
		return this.auth.subscribe(() => {
			if (this.auth.get() === "signedIn") {
				void this.start();
			} else {
				this.stop();
				this.set(this.authorizer.available ? "idle" : "unavailable");
			}
		});
	}

	stop(): void {
		if (this.timer !== null) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}

	async accept(): Promise<void> {
		const tokens = await this.authorizer.authorize().catch(() => null);
		if (tokens === null) {
			this.set("idle");
			return;
		}
		await this.session.adopt(tokens);
		await this.preferences.set(PREFS_KEY, "enabled");
		this.set("connected");
		this.schedule();
		await this.syncNow();
	}

	async decline(): Promise<void> {
		await this.preferences.set(PREFS_KEY, "declined");
		this.set("idle");
	}

	async disconnect(): Promise<void> {
		this.stop();
		await this.session.clear();
		await this.links.clear();
		await this.preferences.set(PREFS_KEY, "declined");
		this.set("idle");
	}

	async syncNow(): Promise<void> {
		if (!this.connected || this.running || !this.connectivity.isOnline()) {
			return;
		}
		this.running = true;
		this.set("syncing");
		try {
			await this.engine.run();
			this.set("connected");
		} catch {
			this.set("failed");
		} finally {
			this.running = false;
		}
	}

	private schedule(): void {
		this.stop();
		this.timer = setInterval(() => void this.syncNow(), INTERVAL_MS);
	}
}
