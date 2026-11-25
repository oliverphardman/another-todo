export interface RandomSource {
	bytes(length: number): Uint8Array;
}

export class SystemRandom implements RandomSource {
	bytes(length: number): Uint8Array {
		const out = new Uint8Array(length);
		const source = (
			globalThis as { crypto?: { getRandomValues?: (array: Uint8Array) => Uint8Array } }
		).crypto;
		if (source?.getRandomValues !== undefined) {
			source.getRandomValues(out);
		} else {
			for (let index = 0; index < length; index += 1) {
				out[index] = Math.floor(Math.random() * 256);
			}
		}
		return out;
	}
}
