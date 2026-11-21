import type { IdentityProvider } from "../auth/authorization-server";

export type Authentication = "none" | "password" | "external";

export interface AppConfig {
	readonly serverUrl: string;
	readonly apiUrl: string;
	readonly authUrl: string;
	readonly clientId: string;
	readonly realtimeUrl: string;
	readonly microsoftClientId: string;
	readonly scheme: string;
	readonly authentication: Authentication;
	readonly providers: readonly IdentityProvider[];
	readonly notice: string | null;
}

export interface BuildConfig {
	readonly authUrl: string;
	readonly clientId: string;
	readonly microsoftClientId: string;
	readonly scheme: string;
	readonly enforcedServerUrl: string | null;
}

export interface ServerInfo {
	readonly authentication: Authentication;
	readonly providers: readonly IdentityProvider[];
	readonly notice: string | null;
	readonly realtimeUrl: string | null;
}

export interface RuntimeConfig {
	readonly serverUrl: string;
	readonly enforced: boolean;
}

const MICROSOFT_CLIENT_ID = "dbb91251-9be4-4765-8e99-f20806a78f1a";

export class AppConfigReader {
	static read(
		env: Record<string, string | undefined>,
		runtime: RuntimeConfig | undefined = (globalThis as { __ATD_CONFIG__?: RuntimeConfig })
			.__ATD_CONFIG__,
		origin: string | undefined = globalThis.location?.origin,
	): BuildConfig {
		return {
			authUrl: AppConfigReader.trimmed(env.EXPO_PUBLIC_AUTH_URL),
			clientId: env.EXPO_PUBLIC_CLIENT_ID ?? "",
			microsoftClientId: env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || MICROSOFT_CLIENT_ID,
			scheme: "anothertodo",
			enforcedServerUrl: AppConfigReader.enforced(env, runtime, origin),
		};
	}

	static compose(build: BuildConfig, serverUrl: string, info: ServerInfo): AppConfig {
		const url = AppConfigReader.trimmed(serverUrl);
		return {
			serverUrl: url,
			apiUrl: url,
			authUrl: build.authUrl,
			clientId: build.clientId,
			realtimeUrl: info.realtimeUrl ?? `${url.replace(/^http/, "ws")}/realtime`,
			microsoftClientId: build.microsoftClientId,
			scheme: build.scheme,
			authentication: info.authentication,
			providers: info.authentication === "external" ? ["Microsoft"] : info.providers,
			notice: info.notice,
		};
	}

	private static enforced(
		env: Record<string, string | undefined>,
		runtime: RuntimeConfig | undefined,
		origin: string | undefined,
	): string | null {
		if (runtime?.enforced === true) {
			return AppConfigReader.trimmed(runtime.serverUrl || origin);
		}
		const built = AppConfigReader.trimmed(env.EXPO_PUBLIC_ENFORCED_SERVER_URL);
		return built === "" ? null : built;
	}

	private static trimmed(value: string | undefined): string {
		return (value ?? "").trim().replace(/\/+$/, "");
	}
}
