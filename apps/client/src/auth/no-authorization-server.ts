import type { AuthorizationServer } from "./authorization-server";
import type { TokenSet } from "./token-set";

export class NoAuthorizationServer implements AuthorizationServer {
	async authorize(): Promise<TokenSet> {
		return { accessToken: "", refreshToken: null, expiresAt: Number.MAX_SAFE_INTEGER };
	}

	async refresh(): Promise<TokenSet> {
		return this.authorize();
	}

	async revoke(): Promise<void> {}
}
