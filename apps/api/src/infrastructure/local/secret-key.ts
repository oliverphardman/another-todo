import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export class SecretKey {
	static load(directory: string, configured: string | null): Buffer {
		if (configured !== null) {
			return Buffer.from(configured);
		}
		const file = join(directory, "secret.key");
		if (existsSync(file)) {
			return Buffer.from(readFileSync(file, "utf8").trim(), "hex");
		}
		const key = randomBytes(32);
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, key.toString("hex"), { mode: 0o600 });
		return key;
	}
}
