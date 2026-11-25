import type { AuthorizationServer, IdentityProvider } from "./authorization-server";
import { LinkingDeepLinks, type DeepLinks } from "./deep-links";
import { SystemRandom, type RandomSource } from "../domain/random";
import { Pkce } from "./pkce";
import type { TokenSet } from "./token-set";

export interface DesktopAuthorizationConfig {
	readonly authUrl: string;
	readonly clientId: string;
	readonly scheme: string;
	readonly now: () => number;
}

export interface DesktopAuthorizationDependencies {
	readonly links: DeepLinks;
	readonly random: RandomSource;
	readonly fetcher: (url: string, init: RequestInit) => Promise<Response>;
	readonly timeoutMs: number;
}

const SCOPES = "openid email profile";
const SIGN_IN_TIMEOUT_MS = 5 * 60_000;

interface TokenResponse {
	readonly access_token: string;
	readonly refresh_token?: string;
	readonly expires_in?: number;
}

export class DesktopAuthorizationServer implements AuthorizationServer {
	private readonly dependencies: DesktopAuthorizationDependencies;

	constructor(
		private readonly config: DesktopAuthorizationConfig,
		dependencies: Partial<DesktopAuthorizationDependencies> = {},
	) {
		this.dependencies = {
			links: dependencies.links ?? new LinkingDeepLinks(),
			random: dependencies.random ?? new SystemRandom(),
			fetcher: dependencies.fetcher ?? ((url, init) => fetch(url, init)),
			timeoutMs: dependencies.timeoutMs ?? SIGN_IN_TIMEOUT_MS,
		};
	}

	private get redirectUri(): string {
		return `${this.config.scheme}://auth/callback`;
	}

	async authorize(provider?: IdentityProvider): Promise<TokenSet | null> {
		const pkce = Pkce.create(this.dependencies.random);
		const query = new URLSearchParams({
			response_type: "code",
			client_id: this.config.clientId,
			redirect_uri: this.redirectUri,
			scope: SCOPES,
			state: pkce.state,
			code_challenge: pkce.challenge,
			code_challenge_method: "S256",
		});
		if (provider !== undefined) {
			query.set("identity_provider", provider);
		}
		const waiting = this.dependencies.links.waitFor(this.redirectUri, this.dependencies.timeoutMs);
		await this.dependencies.links.open(
			`${this.config.authUrl}/oauth2/authorize?${query.toString()}`,
		);
		const returned = await waiting;
		if (returned === null) {
			return null;
		}
		const params = new URL(returned).searchParams;
		const code = params.get("code");
		if (code === null || params.get("state") !== pkce.state) {
			return null;
		}
		return this.exchange({
			grant_type: "authorization_code",
			client_id: this.config.clientId,
			code,
			redirect_uri: this.redirectUri,
			code_verifier: pkce.verifier,
		});
	}

	refresh(refreshToken: string): Promise<TokenSet> {
		return this.exchange({
			grant_type: "refresh_token",
			client_id: this.config.clientId,
			refresh_token: refreshToken,
		});
	}

	async revoke(refreshToken: string): Promise<void> {
		await this.post("revoke", { client_id: this.config.clientId, token: refreshToken });
	}

	private async exchange(form: Record<string, string>): Promise<TokenSet> {
		const body = (await (await this.post("token", form)).json()) as TokenResponse;
		return {
			accessToken: body.access_token,
			refreshToken: body.refresh_token ?? null,
			expiresAt: this.config.now() + (body.expires_in ?? 3600) * 1000,
		};
	}

	private async post(endpoint: string, form: Record<string, string>): Promise<Response> {
		const response = await this.dependencies.fetcher(`${this.config.authUrl}/oauth2/${endpoint}`, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams(form).toString(),
		});
		if (!response.ok) {
			throw new Error(`Authorization server returned ${response.status}`);
		}
		return response;
	}
}
