export interface TokenSet {
	readonly accessToken: string;
	readonly refreshToken: string | null;
	readonly expiresAt: number;
}
