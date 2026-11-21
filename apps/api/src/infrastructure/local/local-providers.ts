import { join } from "node:path";
import { SystemClock } from "../../application/ports";
import { publicUrlOf } from "../../listen-address";
import { Settings } from "../../composition/env";
import type { Env, Identity, Media, Realtime } from "../../composition/platform";
import type { ProviderRegistry } from "../../composition/provider-registry";
import { DiskMediaRoutes, DiskMediaStorage } from "./disk-media";
import { Jwt } from "./jwt";
import {
	AccountRoutes,
	LocalAccounts,
	LocalUserDirectory,
	authenticatorFor,
} from "./password-identity";
import { MicrosoftSignIn } from "./microsoft-sign-in";
import { PasswordHasher } from "./password-hasher";
import { SecretKey } from "./secret-key";
import { SqliteDataStore } from "./sqlite-data-store";
import { SqliteDatabase } from "./sqlite-database";
import { UserRepository } from "./user-repository";
import { WebSocketRealtime } from "./websocket-realtime";

export const DEFAULT_DATA_DIRECTORY = "./data";

export function directoryOf(env: Env): string {
	return new Settings(env).optional("DATA_DIR") ?? DEFAULT_DATA_DIRECTORY;
}

function jwtOf(env: Env): Jwt {
	return new Jwt(SecretKey.load(directoryOf(env), new Settings(env).optional("SECRET_KEY")));
}

function sqlite(env: Env): SqliteDataStore {
	return new SqliteDataStore(SqliteDatabase.in(directoryOf(env)));
}

function disk(env: Env, publicUrl: string): Media {
	const jwt = jwtOf(env);
	const clock = new SystemClock();
	const storage = new DiskMediaStorage(join(directoryOf(env), "media"), publicUrl, jwt, clock);
	return { storage, router: new DiskMediaRoutes(storage, jwt, clock).router() };
}

function password(env: Env): Identity {
	const settings = new Settings(env);
	const users = new UserRepository(SqliteDatabase.in(directoryOf(env)).connection);
	const accounts = new LocalAccounts(users, new PasswordHasher(), jwtOf(env), new SystemClock());
	accounts.ensureAdmin(
		settings.optional("ADMIN_USERNAME") ?? "admin",
		settings.optional("ADMIN_PASSWORD"),
		(message) => process.stdout.write(`${message}\n`),
	);
	const router = new AccountRoutes(accounts).router();
	const clientId = settings.optional("AZURE_CLIENT_ID");
	const clientSecret = settings.optional("AZURE_CLIENT_SECRET");
	const microsoft =
		clientId === null || clientSecret === null
			? null
			: new MicrosoftSignIn(
					{
						clientId,
						clientSecret,
						tenant: settings.optional("AZURE_TENANT_ID") ?? "common",
						publicUrl: publicUrlOf(env),
						origins: settings.list("CORS_ORIGINS"),
					},
					accounts,
					jwtOf(env),
					new SystemClock(),
				);
	if (microsoft !== null) {
		router.use(microsoft.router());
	}
	return {
		mode: "password",
		providers: microsoft === null ? [] : ["Microsoft"],
		authenticator: authenticatorFor(accounts),
		directory: new LocalUserDirectory(users),
		issuer: null,
		router,
	};
}

function websocket(_env: Env, identity: Identity): Realtime {
	return new WebSocketRealtime(identity.authenticator);
}

export const localProviders: ProviderRegistry = {
	data: { sqlite },
	media: { disk },
	identity: { password },
	realtime: { websocket },
};

export const LOCAL_DEFAULTS = {
	data: "sqlite",
	media: "disk",
	identity: "password",
	realtime: "websocket",
} as const;
