import type { TokenSet } from "./token-set";

export type IdentityProvider = "Google" | "Microsoft";

export interface AuthorizationServer {
	authorize(provider?: IdentityProvider): Promise<TokenSet | null>;
	refresh(refreshToken: string): Promise<TokenSet>;
	revoke(refreshToken: string): Promise<void>;
}
