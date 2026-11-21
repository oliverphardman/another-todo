import { Router, type Response as ExpressResponse } from "express";
import type { Clock } from "../../application/ports";
import { ValidationError } from "../../domain/errors";
import { RouteSupport } from "../../http/route-support";
import { Jwt } from "./jwt";
import type { LocalAccounts } from "./password-identity";

export const NATIVE_REDIRECT = "anothertodo://auth/callback";
const STATE_AUDIENCE = "microsoft-state";
const STATE_SECONDS = 600;

export interface MicrosoftSignInConfig {
	readonly clientId: string;
	readonly clientSecret: string;
	readonly tenant: string;
	readonly publicUrl: string;
	readonly origins: readonly string[];
}

export class MicrosoftSignIn {
	constructor(
		private readonly config: MicrosoftSignInConfig,
		private readonly accounts: LocalAccounts,
		private readonly jwt: Jwt,
		private readonly clock: Clock,
		private readonly fetcher: (input: string, init?: RequestInit) => Promise<Response> = (
			input,
			init,
		) => fetch(input, init),
	) {}

	router(): Router {
		const router = Router();
		router.get(
			"/auth/microsoft/start",
			RouteSupport.wrap(async (request, response) => {
				const redirect = String(request.query.redirect_uri ?? "");
				if (!this.allowed(redirect)) {
					throw new ValidationError("redirect_uri is not allowed");
				}
				const state = this.jwt.sign({
					aud: STATE_AUDIENCE,
					exp: this.expiry(),
					redirect,
				});
				response.redirect(this.authorizeUrl(state));
			}),
		);
		router.get(
			"/auth/microsoft/callback",
			RouteSupport.wrap(async (request, response) => {
				const claims = this.jwt.verify(
					String(request.query.state ?? ""),
					STATE_AUDIENCE,
					this.clock.now(),
				);
				if (claims === null) {
					throw new ValidationError("The sign-in request has expired");
				}
				await this.complete(claims.redirect as string, String(request.query.code ?? ""), response);
			}),
		);
		return router;
	}

	private async complete(redirect: string, code: string, response: ExpressResponse): Promise<void> {
		const identity = code === "" ? null : await this.exchange(code);
		if (identity === null) {
			response.redirect(`${redirect}#error=sign_in_failed`);
			return;
		}
		const grant = this.accounts.external("microsoft", identity.subject, identity.email);
		response.redirect(
			`${redirect}#access_token=${encodeURIComponent(grant.accessToken)}&expires_in=${grant.expiresIn}`,
		);
	}

	private async exchange(code: string): Promise<{ subject: string; email: string | null } | null> {
		try {
			const reply = await this.fetcher(`${this.endpoint()}/token`, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					client_id: this.config.clientId,
					client_secret: this.config.clientSecret,
					code,
					grant_type: "authorization_code",
					redirect_uri: this.callbackUrl(),
				}),
			});
			const body = (await reply.json()) as { id_token?: string };
			const payload = JSON.parse(
				Buffer.from(body.id_token!.split(".")[1]!, "base64url").toString(),
			) as {
				aud?: string;
				oid?: string;
				sub?: string;
				email?: string;
				preferred_username?: string;
			};
			const subject = payload.oid ?? payload.sub;
			if (!reply.ok || payload.aud !== this.config.clientId || subject === undefined) {
				return null;
			}
			return { subject, email: payload.email ?? payload.preferred_username ?? null };
		} catch {
			return null;
		}
	}

	private allowed(redirect: string): boolean {
		const origins = [new URL(this.config.publicUrl).origin, ...this.config.origins];
		return (
			redirect === NATIVE_REDIRECT ||
			origins.some((origin) => redirect === `${origin}/auth/callback`)
		);
	}

	private authorizeUrl(state: string): string {
		const query = new URLSearchParams({
			client_id: this.config.clientId,
			response_type: "code",
			redirect_uri: this.callbackUrl(),
			response_mode: "query",
			scope: "openid email profile",
			state,
		});
		return `${this.endpoint()}/authorize?${query.toString()}`;
	}

	private callbackUrl(): string {
		return `${this.config.publicUrl}/auth/microsoft/callback`;
	}

	private endpoint(): string {
		return `https://login.microsoftonline.com/${this.config.tenant}/oauth2/v2.0`;
	}

	private expiry(): number {
		return Math.floor(this.clock.now().getTime() / 1000) + STATE_SECONDS;
	}
}
