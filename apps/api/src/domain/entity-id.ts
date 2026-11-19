import { ValidationError } from "./errors";

const ENTITY_ID = /^[A-Za-z0-9_-]{1,64}$/;

export class EntityId {
	static parse(value: unknown): string {
		if (typeof value !== "string" || !ENTITY_ID.test(value)) {
			throw new ValidationError("id must be 1 to 64 letters, digits, hyphens or underscores");
		}
		return value;
	}
}
