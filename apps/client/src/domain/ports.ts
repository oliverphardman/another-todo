import { SystemRandom, type RandomSource } from "./random";

export interface Clock {
	now(): Date;
}

export interface IdGenerator {
	next(): string;
}

export class SystemClock implements Clock {
	now(): Date {
		return new Date();
	}
}

export class RandomIdGenerator implements IdGenerator {
	constructor(private readonly random: RandomSource = new SystemRandom()) {}

	next(): string {
		const hex = Array.from(this.random.bytes(16), (byte, index) =>
			RandomIdGenerator.versioned(byte, index).toString(16).padStart(2, "0"),
		).join("");
		return [
			hex.slice(0, 8),
			hex.slice(8, 12),
			hex.slice(12, 16),
			hex.slice(16, 20),
			hex.slice(20),
		].join("-");
	}

	private static versioned(byte: number, index: number): number {
		if (index === 6) {
			return (byte & 0x0f) | 0x40;
		}
		return index === 8 ? (byte & 0x3f) | 0x80 : byte;
	}
}
