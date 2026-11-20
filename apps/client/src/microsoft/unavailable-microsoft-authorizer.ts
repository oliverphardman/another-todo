import type { MicrosoftAuthorizer, MicrosoftTokens } from "./microsoft-authorizer";

export class UnavailableMicrosoftAuthorizer implements MicrosoftAuthorizer {
	readonly available = false;

	async authorize(): Promise<MicrosoftTokens | null> {
		return null;
	}

	async refresh(): Promise<MicrosoftTokens> {
		throw new Error("Microsoft To Do sync is not available on this platform");
	}
}
