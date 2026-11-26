import * as AuthSession from "expo-auth-session";
import type { Clock } from "../domain/ports";
import type { MicrosoftAuthorizer, MicrosoftTokens } from "./microsoft-authorizer";
import { MICROSOFT_ENDPOINTS, MICROSOFT_SCOPES } from "./microsoft-endpoints";

export interface ExpoMicrosoftConfig {
	readonly clientId: string;
	readonly scheme: string;
}

const DISCOVERY: AuthSession.DiscoveryDocument = {
	authorizationEndpoint: MICROSOFT_ENDPOINTS.authorization,
	tokenEndpoint: MICROSOFT_ENDPOINTS.token,
};

export class ExpoMicrosoftAuthorizer implements MicrosoftAuthorizer {
	readonly available = true;

	constructor(
		private readonly config: ExpoMicrosoftConfig,
		private readonly clock: Clock,
	) {}

	private get redirectUri(): string {
		return AuthSession.makeRedirectUri({ scheme: this.config.scheme, path: "auth/microsoft" });
	}

	async authorize(): Promise<MicrosoftTokens | null> {
		const request = new AuthSession.AuthRequest({
			clientId: this.config.clientId,
			redirectUri: this.redirectUri,
			scopes: [...MICROSOFT_SCOPES],
			usePKCE: true,
			responseType: AuthSession.ResponseType.Code,
			extraParams: { prompt: "select_account" },
		});
		const result = await request.promptAsync(DISCOVERY);
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
			DISCOVERY,
		);
		return this.toTokens(response);
	}

	async refresh(refreshToken: string): Promise<MicrosoftTokens> {
		const response = await AuthSession.refreshAsync(
			{ clientId: this.config.clientId, refreshToken, scopes: [...MICROSOFT_SCOPES] },
			DISCOVERY,
		);
		return this.toTokens(response);
	}

	private toTokens(response: AuthSession.TokenResponse): MicrosoftTokens {
		return {
			accessToken: response.accessToken,
			refreshToken: response.refreshToken ?? null,
			expiresAt: this.clock.now().getTime() + (response.expiresIn ?? 3600) * 1000,
		};
	}
}
