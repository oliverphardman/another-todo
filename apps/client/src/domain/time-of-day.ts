const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export class TimeOfDay {
	static parse(text: string): string | null {
		const match = TIME_PATTERN.exec(text.trim());
		return match === null ? null : `${match[1]!.padStart(2, "0")}:${match[2]}`;
	}
}
