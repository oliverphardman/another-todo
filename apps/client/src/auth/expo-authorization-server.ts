import * as AuthSession from "expo-auth-session";
import type { AuthorizationServer, IdentityProvider } from "./authorization-server";
import { Profiles } from "./profile";
import type { TokenSet } from "./token-set";

export interface ExpoAuthorizationConfig {
	readonly authUrl: string;
	readonly clientId: string;
	readonly scheme: string;
	readonly now: () => number;
}

const SCOPES = ["openid", "email", "profile"];

export class ExpoAuthorizationServer implements AuthorizationServer {
	constructor(private readonly config: ExpoAuthorizationConfig) {}

	private get discovery(): AuthSession.DiscoveryDocument {
		return {
			authorizationEndpoint: `${this.config.authUrl}/oauth2/authorize`,
			tokenEndpoint: `${this.config.authUrl}/oauth2/token`,
			revocationEndpoint: `${this.config.authUrl}/oauth2/revoke`,
		};
	}

	private get redirectUri(): string {
		return AuthSession.makeRedirectUri({
			scheme: this.config.scheme,
			path: "auth/callback",
		});
	}

	async authorize(provider?: IdentityProvider): Promise<TokenSet | null> {
		const request = new AuthSession.AuthRequest({
			clientId: this.config.clientId,
			redirectUri: this.redirectUri,
			scopes: SCOPES,
			usePKCE: true,
			responseType: AuthSession.ResponseType.Code,
			extraParams: provider === undefined ? {} : { identity_provider: provider },
		});
		const result = await request.promptAsync(this.discovery);
		if (result.type !== "success") {
			return null;
		}
		const response = await AuthSession.exchangeCodeAsync(
			{
				clientId: this.config.clientId,
				code: result.params.code!,
				redirectUri: this.redirectUri,
				extraParams: { code_verifier: request.codeVerifier! },
			},
			this.discovery,
		);
		return this.toTokenSet(response);
	}

	async refresh(refreshToken: string): Promise<TokenSet> {
		const response = await AuthSession.refreshAsync(
			{ clientId: this.config.clientId, refreshToken },
			this.discovery,
		);
		return this.toTokenSet(response);
	}

	async revoke(refreshToken: string): Promise<void> {
		await AuthSession.revokeAsync(
			{
				clientId: this.config.clientId,
				token: refreshToken,
				tokenTypeHint: AuthSession.TokenTypeHint.RefreshToken,
			},
			this.discovery,
		);
	}

	private toTokenSet(response: AuthSession.TokenResponse): TokenSet {
		return {
			accessToken: response.accessToken,
			refreshToken: response.refreshToken ?? null,
			expiresAt: this.config.now() + (response.expiresIn ?? 3600) * 1000,
			profile: Profiles.fromIdToken(response.idToken),
		};
	}
}
