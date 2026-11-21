import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export class PasswordHasher {
	hash(password: string): string {
		const salt = randomBytes(16);
		return `scrypt$${salt.toString("hex")}$${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
	}

	matches(password: string, stored: string): boolean {
		const [scheme, salt, hash] = stored.split("$");
		if (scheme !== "scrypt" || salt === undefined || hash === undefined) {
			return false;
		}
		const expected = Buffer.from(hash, "hex");
		const actual = scryptSync(password, Buffer.from(salt, "hex"), KEY_LENGTH);
		return expected.length === actual.length && timingSafeEqual(expected, actual);
	}
}
