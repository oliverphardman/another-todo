import { describe, expect, it } from "vitest";
import { SystemClock, UuidGenerator } from "../src/application/ports";

describe("ports", () => {
	it("system clock returns the current time", () => {
		const before = Date.now();
		expect(new SystemClock().now().getTime()).toBeGreaterThanOrEqual(before);
	});

	it("uuid generator returns unique uuids", () => {
		const ids = new UuidGenerator();
		const a = ids.next();
		expect(a).toMatch(/^[0-9a-f-]{36}$/);
		expect(ids.next()).not.toBe(a);
	});
});
