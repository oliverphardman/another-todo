import type { TokenSet } from "./token-set";

export type IdentityProvider = "Microsoft";

export interface PasswordCredentials {
	readonly username: string;
	readonly password: string;
}

export interface AuthorizationServer {
	authorize(
		provider?: IdentityProvider,
		credentials?: PasswordCredentials,
	): Promise<TokenSet | null>;
	refresh(refreshToken: string): Promise<TokenSet>;
	revoke(refreshToken: string): Promise<void>;
}
