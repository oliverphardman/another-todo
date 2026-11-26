import {
	DesktopOAuthFlow,
	type DesktopOAuthDependencies,
	type OAuthTokenResponse,
} from "../auth/desktop-oauth-flow";
import type { Clock } from "../domain/ports";
import type { MicrosoftAuthorizer, MicrosoftTokens } from "./microsoft-authorizer";
import { MICROSOFT_ENDPOINTS, MICROSOFT_SCOPES } from "./microsoft-endpoints";

export interface DesktopMicrosoftConfig {
	readonly clientId: string;
	readonly scheme: string;
}

const SCOPE = MICROSOFT_SCOPES.join(" ");

export class DesktopMicrosoftAuthorizer implements MicrosoftAuthorizer {
	readonly available = true;
	private readonly flow: DesktopOAuthFlow;

	constructor(
		config: DesktopMicrosoftConfig,
		private readonly clock: Clock,
		dependencies: Partial<DesktopOAuthDependencies> = {},
	) {
		this.flow = new DesktopOAuthFlow(
			{
				authorizeUrl: MICROSOFT_ENDPOINTS.authorization,
				tokenUrl: MICROSOFT_ENDPOINTS.token,
				clientId: config.clientId,
				redirectUri: `${config.scheme}://auth/microsoft`,
			},
			dependencies,
		);
	}

	async authorize(): Promise<MicrosoftTokens | null> {
		const response = await this.flow.authorize({ scope: SCOPE, prompt: "select_account" });
		return response === null ? null : this.toTokens(response);
	}

	async refresh(refreshToken: string): Promise<MicrosoftTokens> {
		return this.toTokens(
			await this.flow.token({
				grant_type: "refresh_token",
				refresh_token: refreshToken,
				scope: SCOPE,
			}),
		);
	}

	private toTokens(response: OAuthTokenResponse): MicrosoftTokens {
		return {
			accessToken: response.access_token,
			refreshToken: response.refresh_token ?? null,
			expiresAt: this.clock.now().getTime() + (response.expires_in ?? 3600) * 1000,
		};
	}
}
