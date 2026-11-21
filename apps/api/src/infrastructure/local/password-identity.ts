import { randomBytes } from "node:crypto";
import express, { Router } from "express";
import type { DirectoryUser, UserDirectory } from "../../application/user-directory";
import { ForbiddenError, UnauthorizedError, ValidationError } from "../../domain/errors";
import { BearerAuthenticator, type TokenVerifier } from "../../http/authenticator";
import { RouteSupport } from "../../http/route-support";
import { Jwt } from "./jwt";
import { PasswordHasher } from "./password-hasher";
import { UserRepository, type UserAccount } from "./user-repository";

export const ACCESS_AUDIENCE = "access";
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

export interface AccountClock {
	now(): Date;
}

export class LocalAccounts {
	constructor(
		private readonly users: UserRepository,
		private readonly hasher: PasswordHasher,
		private readonly jwt: Jwt,
		private readonly clock: AccountClock,
	) {}

	ensureAdmin(
		username: string,
		password: string | null,
		announce: (message: string) => void,
	): void {
		const existing = this.users.findByUsername(username);
		if (existing !== null && password === null) {
			return;
		}
		const secret = password ?? randomBytes(12).toString("base64url");
		this.users.save({
			username,
			email: existing?.email ?? null,
			passwordHash: this.hasher.hash(secret),
			admin: true,
		});
		if (password === null) {
			announce(`Created the ${username} account with the password ${secret}`);
		}
	}

	login(username: unknown, password: unknown): { accessToken: string; expiresIn: number } {
		const user =
			typeof username === "string" && typeof password === "string"
				? this.users.findByUsername(username)
				: null;
		if (user === null || !this.hasher.matches(password as string, user.passwordHash)) {
			throw new UnauthorizedError("Invalid username or password");
		}
		const exp = Math.floor(this.clock.now().getTime() / 1000) + SESSION_SECONDS;
		return {
			accessToken: this.jwt.sign({ aud: ACCESS_AUDIENCE, sub: user.username, exp }),
			expiresIn: SESSION_SECONDS,
		};
	}

	create(requester: UserAccount | null, input: Record<string, unknown>): UserAccount {
		if (requester === null || !requester.admin) {
			throw new ForbiddenError("Only an administrator can create accounts");
		}
		const { username, password, email } = input;
		if (typeof username !== "string" || !/^[A-Za-z0-9._@+-]{1,64}$/.test(username)) {
			throw new ValidationError("username must be 1 to 64 letters, digits or . _ @ + -");
		}
		if (typeof password !== "string" || password.length < 8) {
			throw new ValidationError("password must be at least 8 characters");
		}
		if (email !== undefined && typeof email !== "string") {
			throw new ValidationError("email must be a string");
		}
		if (this.users.findByUsername(username) !== null) {
			throw new ValidationError(`${username} already exists`);
		}
		const account = {
			username,
			email: email ?? null,
			passwordHash: this.hasher.hash(password),
			admin: false,
		};
		this.users.save(account);
		return account;
	}

	userFor(authorization: string | undefined): UserAccount | null {
		const token = /^Bearer (\S+)$/i.exec(authorization ?? "")?.[1];
		const claims =
			token === undefined ? null : this.jwt.verify(token, ACCESS_AUDIENCE, this.clock.now());
		return claims === null ? null : this.users.findByUsername(claims.sub as string);
	}

	verifier(): TokenVerifier {
		return {
			verify: async (token) => {
				const claims = this.jwt.verify(token, ACCESS_AUDIENCE, this.clock.now());
				const user = claims === null ? null : this.users.findByUsername(claims.sub as string);
				if (user === null) {
					throw new UnauthorizedError("Invalid or expired token");
				}
				return { sub: user.username };
			},
		};
	}
}

export class LocalUserDirectory implements UserDirectory {
	constructor(private readonly users: UserRepository) {}

	async findByEmail(email: string): Promise<DirectoryUser | null> {
		const user = this.users.findByEmail(email);
		return user === null ? null : { sub: user.username, email };
	}
}

export class AccountRoutes {
	constructor(private readonly accounts: LocalAccounts) {}

	router(): Router {
		const router = Router();
		router.use("/auth", express.json());
		router.post(
			"/auth/login",
			RouteSupport.wrap(async (request, response) => {
				const { username, password } = request.body as Record<string, unknown>;
				response.json({ tokenType: "Bearer", ...this.accounts.login(username, password) });
			}),
		);
		router.post(
			"/auth/users",
			RouteSupport.wrap(async (request, response) => {
				const created = this.accounts.create(
					this.accounts.userFor(request.header("authorization")),
					request.body as Record<string, unknown>,
				);
				response.status(201).json({ username: created.username, email: created.email });
			}),
		);
		return router;
	}
}

export function authenticatorFor(accounts: LocalAccounts): BearerAuthenticator {
	return new BearerAuthenticator(accounts.verifier());
}
