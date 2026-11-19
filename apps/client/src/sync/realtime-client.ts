import type { AuthenticationService } from "../auth/authentication-service";
import type { Connectivity } from "../state/connectivity";
import type { SyncTrigger } from "./sync-coordinator";

export interface SocketLike {
	onopen: (() => void) | null;
	onmessage: ((event: { readonly data: unknown }) => void) | null;
	onclose: (() => void) | null;
	onerror: (() => void) | null;
	send(data: string): void;
	close(): void;
}

export type SocketFactory = (url: string) => SocketLike;

const INITIAL_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
const PING_MS = 5 * 60_000;

export class RealtimeClient {
	private socket: SocketLike | null = null;
	private retry: ReturnType<typeof setTimeout> | null = null;
	private ping: ReturnType<typeof setInterval> | null = null;
	private delay = INITIAL_DELAY_MS;
	private running = false;
	private generation = 0;
	private unsubscribe: Array<() => void> = [];

	constructor(
		private readonly url: string,
		private readonly auth: AuthenticationService,
		private readonly connectivity: Connectivity,
		private readonly trigger: SyncTrigger,
		private readonly sockets: SocketFactory,
	) {}

	start(): void {
		this.stop();
		this.running = true;
		this.unsubscribe = [
			this.auth.subscribe(() => this.reconcile()),
			this.connectivity.subscribe(() => this.reconcile()),
		];
		this.reconcile();
	}

	stop(): void {
		this.running = false;
		this.unsubscribe.forEach((off) => off());
		this.unsubscribe = [];
		this.disconnect();
	}

	get connected(): boolean {
		return this.socket !== null;
	}

	private wanted(): boolean {
		return this.running && this.auth.get() === "signedIn" && this.connectivity.isOnline();
	}

	private reconcile(): void {
		if (!this.wanted()) {
			this.disconnect();
		} else if (this.socket === null && this.retry === null) {
			void this.connect();
		}
	}

	private async connect(): Promise<void> {
		const generation = ++this.generation;
		let token: string;
		try {
			token = await this.auth.getAccessToken();
		} catch {
			this.scheduleRetry();
			return;
		}
		if (generation !== this.generation) {
			return;
		}
		const socket = this.sockets(`${this.url}?token=${encodeURIComponent(token)}`);
		this.socket = socket;
		socket.onopen = () => {
			this.delay = INITIAL_DELAY_MS;
			this.ping = setInterval(() => socket.send(JSON.stringify({ action: "ping" })), PING_MS);
			this.trigger.request();
		};
		socket.onmessage = (event) => {
			if (this.isChange(event.data)) {
				this.trigger.request();
			}
		};
		socket.onerror = () => undefined;
		socket.onclose = () => {
			if (this.socket === socket) {
				this.release();
				this.scheduleRetry();
			}
		};
	}

	private isChange(data: unknown): boolean {
		try {
			return (JSON.parse(String(data)) as { type?: unknown }).type === "changed";
		} catch {
			return false;
		}
	}

	private scheduleRetry(): void {
		this.retry = setTimeout(() => {
			this.retry = null;
			this.reconcile();
		}, this.delay);
		this.delay = Math.min(this.delay * 2, MAX_DELAY_MS);
	}

	private release(): void {
		this.socket = null;
		if (this.ping !== null) {
			clearInterval(this.ping);
			this.ping = null;
		}
	}

	private disconnect(): void {
		this.generation += 1;
		if (this.retry !== null) {
			clearTimeout(this.retry);
			this.retry = null;
		}
		const socket = this.socket;
		this.release();
		socket?.close();
	}
}
