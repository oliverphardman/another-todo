import type { AuthorizationServer, IdentityProvider } from "./authorization-server";
import {
	DesktopOAuthFlow,
	type DesktopOAuthDependencies,
	type OAuthTokenResponse,
} from "./desktop-oauth-flow";
import type { TokenSet } from "./token-set";

export interface DesktopAuthorizationConfig {
	readonly authUrl: string;
	readonly clientId: string;
	readonly scheme: string;
	readonly now: () => number;
}

const SCOPES = "openid email profile";

export class DesktopAuthorizationServer implements AuthorizationServer {
	private readonly flow: DesktopOAuthFlow;

	constructor(
		private readonly config: DesktopAuthorizationConfig,
		dependencies: Partial<DesktopOAuthDependencies> = {},
	) {
		this.flow = new DesktopOAuthFlow(
			{
				authorizeUrl: `${config.authUrl}/oauth2/authorize`,
				tokenUrl: `${config.authUrl}/oauth2/token`,
				clientId: config.clientId,
				redirectUri: `${config.scheme}://auth/callback`,
			},
			dependencies,
		);
	}

	async authorize(provider?: IdentityProvider): Promise<TokenSet | null> {
		const response = await this.flow.authorize({
			scope: SCOPES,
			...(provider === undefined ? {} : { identity_provider: provider }),
		});
		return response === null ? null : this.tokenSet(response);
	}

	async refresh(refreshToken: string): Promise<TokenSet> {
		return this.tokenSet(
			await this.flow.token({ grant_type: "refresh_token", refresh_token: refreshToken }),
		);
	}

	async revoke(refreshToken: string): Promise<void> {
		await this.flow.post(`${this.config.authUrl}/oauth2/revoke`, { token: refreshToken });
	}

	private tokenSet(response: OAuthTokenResponse): TokenSet {
		return {
			accessToken: response.access_token,
			refreshToken: response.refresh_token ?? null,
			expiresAt: this.config.now() + (response.expires_in ?? 3600) * 1000,
		};
	}
}
