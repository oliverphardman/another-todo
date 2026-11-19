import { describe, expect, it } from "vitest";
import { DueDay } from "../src/domain/due-day";

describe("DueDay", () => {
	it("validates calendar days", () => {
		expect(DueDay.isValid("2026-11-19")).toBe(true);
		expect(DueDay.isValid("2026-02-30")).toBe(false);
		expect(DueDay.isValid("2026-1-9")).toBe(false);
		expect(DueDay.isValid("tomorrow")).toBe(false);
	});

	it("converts between days and ISO timestamps", () => {
		expect(DueDay.toIso("2026-11-19")).toBe("2026-11-19T00:00:00.000Z");
		expect(DueDay.fromIso("2026-11-19T00:00:00.000Z")).toBe("2026-11-19");
	});

	it("formats local dates", () => {
		expect(DueDay.fromDate(new Date(2026, 0, 5))).toBe("2026-01-05");
	});

	it("does day arithmetic across month boundaries", () => {
		expect(DueDay.add("2026-11-30", 1)).toBe("2026-12-01");
		expect(DueDay.add("2026-03-01", -1)).toBe("2026-02-28");
		expect(DueDay.daysBetween("2026-11-19", "2026-11-26")).toBe(7);
	});

	it("detects overdue days", () => {
		expect(DueDay.isOverdue("2026-11-18", "2026-11-19")).toBe(true);
		expect(DueDay.isOverdue("2026-11-19", "2026-11-19")).toBe(false);
	});

	it("labels days relative to today", () => {
		const today = "2026-11-19";
		expect(DueDay.label("2026-11-19", today)).toBe("Today");
		expect(DueDay.label("2026-11-20", today)).toBe("Tomorrow");
		expect(DueDay.label("2026-11-18", today)).toBe("Yesterday");
		expect(DueDay.label("2026-11-27", today)).toBe("Fri, Nov 27");
		expect(DueDay.label("2027-01-04", today)).toBe("Mon, Jan 4, 2027");
	});

	it("finds the next Monday", () => {
		expect(DueDay.nextWeek("2026-11-19")).toBe("2026-11-23");
		expect(DueDay.nextWeek("2026-11-23")).toBe("2026-11-30");
		expect(DueDay.nextWeek("2026-11-22")).toBe("2026-11-23");
	});
});
