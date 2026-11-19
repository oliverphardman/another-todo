import type { AuthStatus } from "../auth/authentication-service";
import type { Clock } from "../domain/ports";
import type { Connectivity } from "../state/connectivity";
import { Observable } from "../state/observable";
import type { SyncEngine } from "./sync-engine";

export type SyncPhase = "idle" | "syncing" | "offline" | "unauthorized";

export interface SyncStatus {
	readonly phase: SyncPhase;
	readonly lastSyncedAt: string | null;
	readonly rejected: number;
}

export interface SyncTrigger {
	request(): void;
}

const DEBOUNCE_MS = 250;
const POLL_MS = 60_000;

export class SyncCoordinator extends Observable<SyncStatus> implements SyncTrigger {
	private debounce: ReturnType<typeof setTimeout> | null = null;
	private poll: ReturnType<typeof setInterval> | null = null;
	private unsubscribe: (() => void) | null = null;
	private unsubscribeAuth: (() => void) | null = null;

	constructor(
		private readonly engine: SyncEngine,
		private readonly connectivity: Connectivity,
		private readonly clock: Clock,
		private readonly auth: Observable<AuthStatus>,
	) {
		super({ phase: "idle", lastSyncedAt: null, rejected: 0 });
	}

	start(): void {
		this.stop();
		this.unsubscribe = this.connectivity.subscribe(() => {
			if (this.connectivity.isOnline()) {
				void this.syncNow();
			} else {
				this.set({ ...this.get(), phase: "offline" });
			}
		});
		this.unsubscribeAuth = this.auth.subscribe(() => {
			if (this.auth.get() === "signedIn") {
				void this.syncNow();
			} else if (this.auth.get() === "signedOut") {
				this.set({ phase: "idle", lastSyncedAt: null, rejected: 0 });
			}
		});
		this.poll = setInterval(() => {
			if (this.connectivity.isOnline()) {
				void this.syncNow();
			}
		}, POLL_MS);
		void this.syncNow();
	}

	stop(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.unsubscribeAuth?.();
		this.unsubscribeAuth = null;
		if (this.poll !== null) {
			clearInterval(this.poll);
			this.poll = null;
		}
		if (this.debounce !== null) {
			clearTimeout(this.debounce);
			this.debounce = null;
		}
	}

	request(): void {
		if (!this.connectivity.isOnline()) {
			this.set({ ...this.get(), phase: "offline" });
			return;
		}
		if (this.debounce !== null) {
			clearTimeout(this.debounce);
		}
		this.debounce = setTimeout(() => {
			this.debounce = null;
			void this.syncNow();
		}, DEBOUNCE_MS);
	}

	async syncNow(): Promise<void> {
		if (this.auth.get() !== "signedIn") {
			return;
		}
		if (!this.connectivity.isOnline()) {
			this.set({ ...this.get(), phase: "offline" });
			return;
		}
		this.set({ ...this.get(), phase: "syncing" });
		const { outcome, rejected } = await this.engine.sync();
		const total = this.get().rejected + rejected;
		this.set(
			outcome === "synced"
				? { phase: "idle", lastSyncedAt: this.clock.now().toISOString(), rejected: total }
				: { ...this.get(), phase: outcome, rejected: total },
		);
	}

	dismissRejected(): void {
		this.set({ ...this.get(), rejected: 0 });
	}
}
