import { describe, expect, it } from "vitest";
import { Recurrence } from "../src/domain/recurrence";
import { Task } from "../src/domain/task";
import { I18n } from "../src/i18n/i18n";
import { taskData } from "./support/fakes";

const TODAY = "2026-11-19";

describe("Recurrence", () => {
	it("starts a rule from the day it is chosen", () => {
		expect(Recurrence.starting("daily", TODAY).rule).toEqual({ frequency: "daily" });
		expect(Recurrence.starting("weekly", TODAY).rule).toEqual({
			frequency: "weekly",
			weekdays: [4],
		});
		expect(Recurrence.starting("monthly", TODAY).rule).toEqual({
			frequency: "monthly",
			monthDay: 19,
		});
		expect(Recurrence.starting("yearly", "2028-02-29").rule).toEqual({
			frequency: "yearly",
			monthDay: 29,
		});
	});

	it("adds and removes weekdays but always keeps one", () => {
		const thursday = Recurrence.starting("weekly", TODAY);
		expect(thursday.toggling(1).rule.weekdays).toEqual([1, 4]);
		expect(thursday.toggling(1).toggling(4).rule.weekdays).toEqual([1]);
		expect(thursday.toggling(4)).toBe(thursday);
		expect(new Recurrence({ frequency: "weekly" }).toggling(2).rule.weekdays).toEqual([2]);
	});

	it("finds the next day for every frequency", () => {
		const after = (rule: ConstructorParameters<typeof Recurrence>[0], day: string) =>
			new Recurrence(rule).after(day);
		expect(after({ frequency: "daily" }, "2026-12-31")).toBe("2027-01-01");
		expect(after({ frequency: "weekly", weekdays: [1, 5] }, TODAY)).toBe("2026-11-20");
		expect(after({ frequency: "weekly", weekdays: [1, 5] }, "2026-11-20")).toBe("2026-11-23");
		expect(after({ frequency: "weekly" }, TODAY)).toBe("2026-11-26");
		expect(after({ frequency: "monthly" }, "2026-12-15")).toBe("2027-01-15");
		expect(after({ frequency: "yearly" }, TODAY)).toBe("2027-11-19");
	});

	it("keeps aiming for the same day of the month after a short month", () => {
		const monthly = new Recurrence({ frequency: "monthly", monthDay: 31 });
		expect(monthly.after("2027-01-31")).toBe("2027-02-28");
		expect(monthly.after("2027-02-28")).toBe("2027-03-31");
		const leap = new Recurrence({ frequency: "yearly", monthDay: 29 });
		expect(leap.after("2028-02-29")).toBe("2029-02-28");
		expect(leap.after("2031-02-28")).toBe("2032-02-29");
	});

	it("moves a first due day onto a chosen weekday only for weekly rules", () => {
		const monday = new Recurrence({ frequency: "weekly", weekdays: [1] });
		expect(monday.firstOnOrAfter(TODAY)).toBe("2026-11-23");
		expect(monday.firstOnOrAfter("2026-11-23")).toBe("2026-11-23");
		expect(new Recurrence({ frequency: "daily" }).firstOnOrAfter(TODAY)).toBe(TODAY);
	});

	it("skips occurrences already in the past", () => {
		const daily = new Recurrence({ frequency: "daily" });
		expect(daily.upcoming("2026-11-01", TODAY)).toBe(TODAY);
		expect(daily.upcoming(TODAY, TODAY)).toBe("2026-11-20");
		expect(daily.upcoming("2026-11-30", TODAY)).toBe("2026-12-01");
	});
});

describe("Task.nextOccurrence", () => {
	const repeating = new Task(
		taskData({
			id: "a".repeat(64),
			completed: true,
			dueDate: "2026-11-19T00:00:00.000Z",
			remindAt: new Date(2026, 10, 19, 9, 0).toISOString(),
			repeat: { frequency: "daily" },
			myDay: TODAY,
			position: 4,
			note: "Keep",
			steps: [{ id: "s", title: "Step", completed: true }],
		}),
	);

	it("copies the task onto the next day with a fresh state", () => {
		const next = repeating.nextOccurrence(TODAY, "now")!;
		expect(next.data).toMatchObject({
			id: `${"a".repeat(54)}-r20261120`,
			completed: false,
			dueDate: "2026-11-20T00:00:00.000Z",
			remindAt: new Date(2026, 10, 20, 9, 0).toISOString(),
			repeat: { frequency: "daily" },
			myDay: null,
			position: null,
			note: "Keep",
			steps: [{ id: "s", title: "Step", completed: false }],
			createdAt: "now",
		});
	});

	it("gives every device the same id, which does not grow along a series", () => {
		const second = repeating.nextOccurrence(TODAY, "now")!.with({ completed: true });
		expect(second.nextOccurrence(TODAY, "later")!.id).toBe(`${"a".repeat(54)}-r20261121`);
	});

	it("counts from today when there is no due date or reminder", () => {
		const loose = repeating.with({ dueDate: null, remindAt: null });
		expect(loose.nextOccurrence(TODAY, "now")!.data).toMatchObject({
			dueDate: "2026-11-20T00:00:00.000Z",
			remindAt: null,
		});
	});

	it("has none while open or once it stops repeating", () => {
		expect(repeating.with({ completed: false }).nextOccurrence(TODAY, "now")).toBeNull();
		expect(repeating.with({ repeat: null }).nextOccurrence(TODAY, "now")).toBeNull();
	});
});

describe("repeat labels", () => {
	it("names each rule, ordering weekdays from the locale's first day", () => {
		const us = new I18n("en-US");
		expect(us.repeatLabel({ frequency: "daily" })).toBe("Daily");
		expect(us.repeatLabel({ frequency: "yearly" })).toBe("Yearly");
		expect(us.repeatLabel({ frequency: "weekly", weekdays: [0, 1] })).toBe("Weekly on Sun, Mon");
		expect(new I18n("en-GB").repeatLabel({ frequency: "weekly", weekdays: [0, 1] })).toBe(
			"Weekly on Mon, Sun",
		);
		expect(us.repeatLabel({ frequency: "weekly" })).toBe("Weekly on ");
	});
});
