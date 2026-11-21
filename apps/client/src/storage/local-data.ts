import type { KeyValueStore } from "./key-value-store";

const DATA_KEYS = ["atd.snapshot", "atd.paneWidths", "atd.msLinks", "atd.msPrefs"];
const TOKEN_KEYS = ["atd.tokens", "atd.msTokens"];

export class LocalData {
	static async discard(data: KeyValueStore, tokens: KeyValueStore): Promise<void> {
		await Promise.all([
			...DATA_KEYS.map((key) => data.remove(key)),
			...TOKEN_KEYS.map((key) => tokens.remove(key)),
		]);
	}
}
