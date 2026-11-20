import type { Clock } from "../domain/ports";
import type { KeyValueStore } from "../storage/key-value-store";
import type { GraphTokenProvider } from "./graph-todo-gateway";
import type { MicrosoftAuthorizer, MicrosoftTokens } from "./microsoft-authorizer";

const KEY = "atd.msTokens";
const SKEW_MS = 60_000;

export class MicrosoftSession implements GraphTokenProvider {
	private tokens: MicrosoftTokens | null = null;

	constructor(
		private readonly storage: KeyValueStore,
		private readonly authorizer: MicrosoftAuthorizer,
		private readonly clock: Clock,
	) {}

	async restore(): Promise<boolean> {
		const stored = await this.storage.get(KEY);
		if (stored === null) {
			return false;
		}
		try {
			const parsed = JSON.parse(stored) as Partial<MicrosoftTokens>;
			if (typeof parsed.accessToken === "string" && typeof parsed.expiresAt === "number") {
				this.tokens = {
					accessToken: parsed.accessToken,
					refreshToken: parsed.refreshToken ?? null,
					expiresAt: parsed.expiresAt,
				};
			}
		} catch {
			this.tokens = null;
		}
		return this.tokens !== null;
	}

	async adopt(tokens: MicrosoftTokens): Promise<void> {
		this.tokens = tokens;
		await this.storage.set(KEY, JSON.stringify(tokens));
	}

	async clear(): Promise<void> {
		this.tokens = null;
		await this.storage.remove(KEY);
	}

	async accessToken(): Promise<string> {
		const tokens = this.tokens;
		if (tokens === null) {
			throw new Error("Not connected to Microsoft");
		}
		if (tokens.expiresAt - SKEW_MS > this.clock.now().getTime()) {
			return tokens.accessToken;
		}
		if (tokens.refreshToken === null) {
			throw new Error("The Microsoft session has expired");
		}
		const refreshed = await this.authorizer.refresh(tokens.refreshToken);
		await this.adopt({ ...refreshed, refreshToken: refreshed.refreshToken ?? tokens.refreshToken });
		return refreshed.accessToken;
	}
}
