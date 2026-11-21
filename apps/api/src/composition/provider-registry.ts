import type { DataStore } from "../application/data-store";
import type { Env, Identity, Media, Platform, Realtime } from "./platform";

export interface ProviderRegistry {
	readonly data: Readonly<Record<string, (env: Env) => DataStore>>;
	readonly media: Readonly<Record<string, (env: Env, publicUrl: string) => Media>>;
	readonly identity: Readonly<Record<string, (env: Env) => Identity>>;
	readonly realtime: Readonly<Record<string, (env: Env, identity: Identity) => Realtime>>;
}

export interface ProviderDefaults {
	readonly data: string;
	readonly media: string;
	readonly identity: string;
	readonly realtime: string;
}

export const PROVIDER_VARIABLES = {
	data: "DATA_PROVIDER",
	media: "MEDIA_PROVIDER",
	identity: "AUTH_PROVIDER",
	realtime: "REALTIME_PROVIDER",
} as const;

export class ProviderRegistries {
	static merge(...registries: Partial<ProviderRegistry>[]): ProviderRegistry {
		return {
			data: Object.assign({}, ...registries.map((registry) => registry.data)),
			media: Object.assign({}, ...registries.map((registry) => registry.media)),
			identity: Object.assign({}, ...registries.map((registry) => registry.identity)),
			realtime: Object.assign({}, ...registries.map((registry) => registry.realtime)),
		};
	}
}

export class PlatformFactory {
	constructor(
		private readonly registry: ProviderRegistry,
		private readonly defaults: ProviderDefaults,
	) {}

	identity(env: Env): Identity {
		return this.choose(this.registry.identity, "identity", env)(env);
	}

	create(env: Env, publicUrl: string): Platform {
		const identity = this.identity(env);
		return {
			data: this.choose(this.registry.data, "data", env)(env),
			media: this.choose(this.registry.media, "media", env)(env, publicUrl),
			identity,
			realtime: this.choose(this.registry.realtime, "realtime", env)(env, identity),
		};
	}

	private choose<T>(
		providers: Readonly<Record<string, T>>,
		kind: keyof ProviderDefaults,
		env: Env,
	): T {
		const variable = PROVIDER_VARIABLES[kind];
		const name = env[variable]?.trim() || this.defaults[kind];
		const provider = providers[name];
		if (provider === undefined) {
			throw new Error(
				`${variable} must be one of ${Object.keys(providers).join(", ")} (got ${name})`,
			);
		}
		return provider;
	}
}
