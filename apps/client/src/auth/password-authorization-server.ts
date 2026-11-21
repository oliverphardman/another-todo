import type { Fetcher } from "../api/authorized-http";
import type {
	AuthorizationServer,
	IdentityProvider,
	PasswordCredentials,
} from "./authorization-server";
import type { BrowserSession } from "./browser-session";
import type { TokenSet } from "./token-set";

export class InvalidCredentialsError extends Error {}

export interface PasswordAuthorizationConfig {
	readonly apiUrl: string;
	readonly now: () => number;
	readonly browser: BrowserSession;
	readonly fetcher?: Fetcher;
}

export class PasswordAuthorizationServer implements AuthorizationServer {
	constructor(private readonly config: PasswordAuthorizationConfig) {}

	async authorize(
		provider?: IdentityProvider,
		credentials?: PasswordCredentials,
	): Promise<TokenSet | null> {
		if (provider !== undefined) {
			return this.viaBrowser(provider);
		}
		if (credentials === undefined) {
			return null;
		}
		const fetcher = this.config.fetcher ?? ((url, init) => fetch(url, init));
		const response = await fetcher(`${this.config.apiUrl}/auth/login`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(credentials),
		});
		if (!response.ok) {
			throw new InvalidCredentialsError();
		}
		const body = (await response.json()) as { accessToken: string; expiresIn: number };
		return this.tokenSet(body.accessToken, body.expiresIn);
	}

	async refresh(): Promise<TokenSet> {
		throw new InvalidCredentialsError();
	}

	async revoke(): Promise<void> {}

	private async viaBrowser(provider: IdentityProvider): Promise<TokenSet | null> {
		const start = `${this.config.apiUrl}/auth/${provider.toLowerCase()}/start`;
		const returned = await this.config.browser.authorize(
			`${start}?redirect_uri=${encodeURIComponent(this.config.browser.redirectUri)}`,
		);
		if (returned === null) {
			return null;
		}
		const fragment = new URLSearchParams(new URL(returned).hash.slice(1));
		const token = fragment.get("access_token");
		if (token === null) {
			throw new InvalidCredentialsError();
		}
		return this.tokenSet(token, Number(fragment.get("expires_in")));
	}

	private tokenSet(accessToken: string, expiresIn: number): TokenSet {
		return {
			accessToken,
			refreshToken: null,
			expiresAt: this.config.now() + expiresIn * 1000,
		};
	}
}
