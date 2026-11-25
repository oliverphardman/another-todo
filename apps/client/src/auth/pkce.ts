import type { RandomSource } from "../domain/random";
import { Base64Url, Sha256 } from "./sha256";

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
