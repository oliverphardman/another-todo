import type { Fetcher } from "../api/authorized-http";
import type { AuthorizationServer } from "./authorization-server";
import type { TokenSet } from "./token-set";

export interface DemoAuthorizationConfig {
	readonly region: string;
	readonly clientId: string;
	readonly username: string;
	readonly password: string;
	readonly now: () => number;
	readonly fetcher?: Fetcher;
}

interface AuthenticationResult {
	readonly AccessToken: string;
	readonly RefreshToken?: string;
	readonly ExpiresIn?: number;
}

export class DemoAuthorizationServer implements AuthorizationServer {
	constructor(private readonly config: DemoAuthorizationConfig) {}

	async authorize(): Promise<TokenSet> {
		return this.initiate("USER_PASSWORD_AUTH", {
			USERNAME: this.config.username,
			PASSWORD: this.config.password,
		});
	}

	async refresh(refreshToken: string): Promise<TokenSet> {
		return this.initiate("REFRESH_TOKEN_AUTH", { REFRESH_TOKEN: refreshToken });
	}

	async revoke(): Promise<void> {}

	private async initiate(flow: string, parameters: Record<string, string>): Promise<TokenSet> {
		const fetcher = this.config.fetcher ?? ((url, init) => fetch(url, init));
		const response = await fetcher(`https://cognito-idp.${this.config.region}.amazonaws.com/`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-amz-json-1.1",
				"X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
			},
			body: JSON.stringify({
				AuthFlow: flow,
				ClientId: this.config.clientId,
				AuthParameters: parameters,
			}),
		});
		if (!response.ok) {
			throw new Error(`Demo sign-in failed with status ${response.status}`);
		}
		const body = (await response.json()) as { AuthenticationResult: AuthenticationResult };
		const result = body.AuthenticationResult;
		return {
			accessToken: result.AccessToken,
			refreshToken: result.RefreshToken ?? null,
			expiresAt: this.config.now() + (result.ExpiresIn ?? 3600) * 1000,
		};
	}
}
