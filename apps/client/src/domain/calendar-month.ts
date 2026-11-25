import { DueDay } from "./due-day";

const DAYS_PER_WEEK = 7;

export class CalendarMonth {
	private constructor(readonly firstDay: string) {}

	static containing(day: string): CalendarMonth {
		return new CalendarMonth(`${day.slice(0, 7)}-01`);
	}

	previous(): CalendarMonth {
		return CalendarMonth.containing(DueDay.add(this.firstDay, -1));
	}

	next(): CalendarMonth {
		return CalendarMonth.containing(DueDay.add(this.firstDay, 31));
	}

	weeks(firstWeekday: number): (string | null)[][] {
		const weekday = new Date(DueDay.toIso(this.firstDay)).getUTCDay();
		const leading = (weekday - firstWeekday + DAYS_PER_WEEK) % DAYS_PER_WEEK;
		const length = DueDay.daysBetween(this.firstDay, this.next().firstDay);
		const cells = Array.from(
			{ length: Math.ceil((leading + length) / DAYS_PER_WEEK) * DAYS_PER_WEEK },
			(_, index) =>
				index < leading || index >= leading + length
					? null
					: DueDay.add(this.firstDay, index - leading),
		);
		return Array.from({ length: cells.length / DAYS_PER_WEEK }, (_, week) =>
			cells.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK),
		);
	}
}
