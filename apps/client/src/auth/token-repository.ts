import type { KeyValueStore } from "../storage/key-value-store";
import type { TokenSet } from "./token-set";

const TOKEN_KEY = "atd.tokens";

export class TokenRepository {
	constructor(private readonly store: KeyValueStore) {}

	async load(): Promise<TokenSet | null> {
		const stored = await this.store.get(TOKEN_KEY);
		if (stored === null) {
			return null;
		}
		try {
			const parsed = JSON.parse(stored) as Partial<TokenSet>;
			if (typeof parsed.accessToken === "string" && typeof parsed.expiresAt === "number") {
				return {
					accessToken: parsed.accessToken,
					refreshToken: parsed.refreshToken ?? null,
					expiresAt: parsed.expiresAt,
				};
			}
		} catch {
			return null;
		}
		return null;
	}

	save(tokens: TokenSet): Promise<void> {
		return this.store.set(TOKEN_KEY, JSON.stringify(tokens));
	}

	clear(): Promise<void> {
		return this.store.remove(TOKEN_KEY);
	}
}
