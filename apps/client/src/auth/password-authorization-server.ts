import type { Fetcher } from "../api/authorized-http";
import type { AuthorizationServer, PasswordCredentials } from "./authorization-server";
import type { TokenSet } from "./token-set";

export class InvalidCredentialsError extends Error {}

export interface PasswordAuthorizationConfig {
	readonly apiUrl: string;
	readonly now: () => number;
	readonly fetcher?: Fetcher;
}

export class PasswordAuthorizationServer implements AuthorizationServer {
	constructor(private readonly config: PasswordAuthorizationConfig) {}

	async authorize(
		_provider?: unknown,
		credentials?: PasswordCredentials,
	): Promise<TokenSet | null> {
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
		return {
			accessToken: body.accessToken,
			refreshToken: null,
			expiresAt: this.config.now() + body.expiresIn * 1000,
		};
	}

	async refresh(): Promise<TokenSet> {
		throw new InvalidCredentialsError();
	}

	async revoke(): Promise<void> {}
}
