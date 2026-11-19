import { Base64Url, Sha256 } from "./sha256";

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

export interface PkcePair {
	readonly verifier: string;
	readonly challenge: string;
	readonly state: string;
}

export class Pkce {
	static create(random: RandomSource): PkcePair {
		const verifier = Base64Url.encode(random.bytes(48));
		return {
			verifier,
			challenge: Base64Url.encode(Sha256.digest(new TextEncoder().encode(verifier))),
			state: Base64Url.encode(random.bytes(16)),
		};
	}
}
