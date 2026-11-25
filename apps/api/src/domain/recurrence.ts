export const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;

export type Frequency = (typeof FREQUENCIES)[number];

export interface Recurrence {
	readonly frequency: Frequency;
	readonly weekdays?: readonly number[];
	readonly monthDay?: number;
}
