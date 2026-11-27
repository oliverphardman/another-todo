const LIMIT = 80;
const FORBIDDEN = /[\\/:*?"<>|\p{Cc}]/gu;
const RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

export class ExportFileName {
	static of(title: string, extension: string, fallback: string): string {
		const cleaned = Array.from(title.replace(FORBIDDEN, " ").replace(/\s+/g, " "))
			.slice(0, LIMIT)
			.join("")
			.replace(/^[\s.]+|[\s.]+$/g, "");
		const usable = cleaned === "" || RESERVED.test(cleaned) ? fallback : cleaned;
		return `${usable}.${extension}`;
	}
}
