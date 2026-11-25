const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

export class DueDay {
	static isValid(day: string): boolean {
		if (!DAY_PATTERN.test(day)) {
			return false;
		}
		return DueDay.fromDay(day).toISOString().startsWith(day);
	}

	static fromDate(date: Date): string {
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const dayOfMonth = String(date.getDate()).padStart(2, "0");
		return `${date.getFullYear()}-${month}-${dayOfMonth}`;
	}

	static toLocalDate(day: string): Date {
		const [year, month, dayOfMonth] = day.split("-").map(Number);
		return new Date(year!, month! - 1, dayOfMonth!);
	}

	static toIso(day: string): string {
		return `${day}T00:00:00.000Z`;
	}

	static fromIso(iso: string): string {
		return iso.slice(0, 10);
	}

	static add(day: string, days: number): string {
		return new Date(DueDay.fromDay(day).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
	}

	static daysBetween(from: string, to: string): number {
		return Math.round((DueDay.fromDay(to).getTime() - DueDay.fromDay(from).getTime()) / MS_PER_DAY);
	}

	static weekday(day: string): number {
		return DueDay.fromDay(day).getUTCDay();
	}

	static isOverdue(day: string, today: string): boolean {
		return day < today;
	}

	static nextWeek(today: string): string {
		const weekday = DueDay.fromDay(today).getUTCDay();
		const untilMonday = (8 - weekday) % 7 || 7;
		return DueDay.add(today, untilMonday);
	}

	private static fromDay(day: string): Date {
		return new Date(`${day}T00:00:00.000Z`);
	}
}
