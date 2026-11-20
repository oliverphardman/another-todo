export interface MicrosoftTokens {
	readonly accessToken: string;
	readonly refreshToken: string | null;
	readonly expiresAt: number;
}

export interface MicrosoftAuthorizer {
	readonly available: boolean;
	authorize(): Promise<MicrosoftTokens | null>;
	refresh(refreshToken: string): Promise<MicrosoftTokens>;
}
