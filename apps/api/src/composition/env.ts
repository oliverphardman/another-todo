import type { Env } from "./platform";

export class Settings {
	constructor(private readonly env: Env) {}

	require<K extends string>(...names: K[]): Record<K, string> {
		const missing = names.filter((name) => !this.env[name]);
		if (missing.length > 0) {
			throw new Error(`${names.join(", ")} must be set`);
		}
		return Object.fromEntries(names.map((name) => [name, this.env[name]!])) as Record<K, string>;
	}

	optional(name: string): string | null {
		const value = this.env[name]?.trim();
		return value === undefined || value === "" ? null : value;
	}

	list(name: string): string[] {
		return (this.env[name] ?? "")
			.split(",")
			.map((entry) => entry.trim())
			.filter((entry) => entry.length > 0);
	}
}
