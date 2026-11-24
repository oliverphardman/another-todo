import { afterEach, describe, expect, it, vi } from "vitest";
import { PluralRule } from "../src/i18n/plural-rule";

describe("PluralRule", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("uses Intl.PluralRules when the runtime has it", () => {
		const rule = PluralRule.for("en-US");
		expect(rule.isSingular(1)).toBe(true);
		expect(rule.isSingular(2)).toBe(false);
		expect(rule.isSingular(0)).toBe(false);
	});

	it("falls back to a simple singular check when Intl.PluralRules is missing", () => {
		vi.stubGlobal("Intl", { DateTimeFormat: Intl.DateTimeFormat });
		const rule = PluralRule.for("en-US");
		expect(rule.isSingular(1)).toBe(true);
		expect(rule.isSingular(2)).toBe(false);
		expect(rule.isSingular(0)).toBe(false);
	});

	it("falls back when Intl does not exist at all", () => {
		vi.stubGlobal("Intl", undefined);
		expect(PluralRule.for("en-US").isSingular(1)).toBe(true);
	});
});
