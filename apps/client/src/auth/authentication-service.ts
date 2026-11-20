import { AuthRequiredError } from "../api/errors";
import type { TokenProvider } from "../api/http-api-gateway";
import type { Clock } from "../domain/ports";
import { Observable } from "../state/observable";
import type { AuthorizationServer, IdentityProvider } from "./authorization-server";
import type { TokenRepository } from "./token-repository";
import type { TokenSet } from "./token-set";

export type AuthStatus = "loading" | "signedOut" | "signedIn";

const EXPIRY_SKEW_MS = 60_000;

export class AuthenticationService extends Observable<AuthStatus> implements TokenProvider {
	private tokens: TokenSet | null = null;
	private refreshing: Promise<TokenSet> | null = null;

	constructor(
		private readonly server: AuthorizationServer,
		private readonly repository: TokenRepository,
		private readonly clock: Clock,
		readonly automatic = false,
	) {
		super("loading");
	}

	async restore(): Promise<void> {
		this.tokens = await this.repository.load();
		if (this.tokens === null && this.automatic) {
			await this.signIn().catch(() => undefined);
		}
		this.set(this.tokens === null ? "signedOut" : "signedIn");
	}

	async signIn(provider?: IdentityProvider): Promise<void> {
		const tokens = await this.server.authorize(provider);
		if (tokens !== null) {
			await this.adopt(tokens);
		}
	}

	async signOut(): Promise<void> {
		const refreshToken = this.tokens?.refreshToken ?? null;
		await this.forget();
		if (refreshToken !== null) {
			await this.server.revoke(refreshToken).catch(() => undefined);
		}
	}

	async getAccessToken(): Promise<string> {
		const tokens = this.tokens;
		if (tokens === null) {
			throw new AuthRequiredError();
		}
		if (tokens.expiresAt - EXPIRY_SKEW_MS > this.clock.now().getTime()) {
			return tokens.accessToken;
		}
		if (tokens.refreshToken === null) {
			await this.forget();
			throw new AuthRequiredError();
		}
		this.refreshing ??= this.server.refresh(tokens.refreshToken).finally(() => {
			this.refreshing = null;
		});
		try {
			const refreshed = await this.refreshing;
			await this.adopt({
				...refreshed,
				refreshToken: refreshed.refreshToken ?? tokens.refreshToken,
			});
			return refreshed.accessToken;
		} catch {
			await this.forget();
			throw new AuthRequiredError();
		}
	}

	private async adopt(tokens: TokenSet): Promise<void> {
		this.tokens = tokens;
		await this.repository.save(tokens);
		this.set("signedIn");
	}

	private async forget(): Promise<void> {
		this.tokens = null;
		await this.repository.clear();
		this.set("signedOut");
	}
}
