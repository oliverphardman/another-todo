import { DueDay } from "./due-day";

export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export type Frequency = (typeof FREQUENCIES)[number];

export interface RepeatRule {
	readonly frequency: Frequency;
	readonly weekdays?: readonly number[];
	readonly monthDay?: number;
}

export class Recurrence {
	constructor(readonly rule: RepeatRule) {}

	static starting(frequency: Frequency, day: string): Recurrence {
		if (frequency === "weekly") {
			return new Recurrence({ frequency, weekdays: [DueDay.weekday(day)] });
		}
		return new Recurrence({ frequency }).anchoredTo(day);
	}

	anchoredTo(day: string): Recurrence {
		const { frequency } = this.rule;
		if (frequency !== "monthly" && frequency !== "yearly") {
			return this;
		}
		return new Recurrence({ frequency, monthDay: Number(day.slice(8)) });
	}

	toggling(weekday: number): Recurrence {
		const current = this.rule.weekdays ?? [];
		const weekdays = current.includes(weekday)
			? current.filter((day) => day !== weekday)
			: [...current, weekday].sort((a, b) => a - b);
		return weekdays.length === 0 ? this : new Recurrence({ ...this.rule, weekdays });
	}

	firstOnOrAfter(day: string): string {
		return this.rule.frequency === "weekly" ? this.after(DueDay.add(day, -1)) : day;
	}

	after(day: string): string {
		switch (this.rule.frequency) {
			case "daily":
				return DueDay.add(day, 1);
			case "weekly":
				return this.nextWeekday(day);
			case "monthly":
				return this.monthsLater(day, 1);
			case "yearly":
				return this.monthsLater(day, 12);
		}
	}

	upcoming(due: string, today: string): string {
		let next = this.after(due);
		while (next < today) {
			next = this.after(next);
		}
		return next;
	}

	private nextWeekday(day: string): string {
		const wanted = this.rule.weekdays ?? [DueDay.weekday(day)];
		let next = DueDay.add(day, 1);
		while (!wanted.includes(DueDay.weekday(next))) {
			next = DueDay.add(next, 1);
		}
		return next;
	}

	private monthsLater(day: string, months: number): string {
		const [year, month, dayOfMonth] = day.split("-").map(Number);
		const first = new Date(Date.UTC(year!, month! - 1 + months, 1));
		const length = new Date(
			Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
		).getUTCDate();
		first.setUTCDate(Math.min(this.rule.monthDay ?? dayOfMonth!, length));
		return first.toISOString().slice(0, 10);
	}
}
