import { SystemRandom, type RandomSource } from "../domain/random";
import { LinkingDeepLinks, type DeepLinks } from "./deep-links";
import { Pkce } from "./pkce";

export interface DesktopOAuthClient {
	readonly authorizeUrl: string;
	readonly tokenUrl: string;
	readonly clientId: string;
	readonly redirectUri: string;
}

export interface DesktopOAuthDependencies {
	readonly links: DeepLinks;
	readonly random: RandomSource;
	readonly fetcher: (url: string, init: RequestInit) => Promise<Response>;
	readonly timeoutMs: number;
}

export interface OAuthTokenResponse {
	readonly access_token: string;
	readonly refresh_token?: string;
	readonly id_token?: string;
	readonly expires_in?: number;
}

const SIGN_IN_TIMEOUT_MS = 5 * 60_000;

export class DesktopOAuthFlow {
	private readonly dependencies: DesktopOAuthDependencies;

	constructor(
		private readonly client: DesktopOAuthClient,
		dependencies: Partial<DesktopOAuthDependencies> = {},
	) {
		this.dependencies = {
			links: dependencies.links ?? new LinkingDeepLinks(),
			random: dependencies.random ?? new SystemRandom(),
			fetcher: dependencies.fetcher ?? ((url, init) => fetch(url, init)),
			timeoutMs: dependencies.timeoutMs ?? SIGN_IN_TIMEOUT_MS,
		};
	}

	async authorize(parameters: Record<string, string>): Promise<OAuthTokenResponse | null> {
		const { authorizeUrl, clientId, redirectUri } = this.client;
		const pkce = Pkce.create(this.dependencies.random);
		const query = new URLSearchParams({
			response_type: "code",
			client_id: clientId,
			redirect_uri: redirectUri,
			state: pkce.state,
			code_challenge: pkce.challenge,
			code_challenge_method: "S256",
			...parameters,
		});
		const waiting = this.dependencies.links.waitFor(redirectUri, this.dependencies.timeoutMs);
		await this.dependencies.links.open(`${authorizeUrl}?${query.toString()}`);
		const returned = await waiting;
		if (returned === null) {
			return null;
		}
		const params = new URL(returned).searchParams;
		const code = params.get("code");
		if (code === null || params.get("state") !== pkce.state) {
			return null;
		}
		return this.token({
			grant_type: "authorization_code",
			code,
			redirect_uri: redirectUri,
			code_verifier: pkce.verifier,
		});
	}

	async token(grant: Record<string, string>): Promise<OAuthTokenResponse> {
		const response = await this.post(this.client.tokenUrl, grant);
		return (await response.json()) as OAuthTokenResponse;
	}

	async post(url: string, form: Record<string, string>): Promise<Response> {
		const response = await this.dependencies.fetcher(url, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ client_id: this.client.clientId, ...form }).toString(),
		});
		if (!response.ok) {
			throw new Error(`Authorization server returned ${response.status}`);
		}
		return response;
	}
}
