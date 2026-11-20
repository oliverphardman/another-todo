export interface AppConfig {
	readonly apiUrl: string;
	readonly authUrl: string;
	readonly clientId: string;
	readonly realtimeUrl: string;
	readonly microsoftClientId: string;
	readonly scheme: string;
}

const DEFAULTS = {
	apiUrl: "https://api.another-todo.oliverhardman.dev",
	authUrl: "https://auth.another-todo.oliverhardman.dev",
	clientId: "rm2gcmocak3qo442q9p0r191q",
	realtimeUrl: "wss://s1gss3s4qg.execute-api.eu-west-1.amazonaws.com/dev",
	microsoftClientId: "dbb91251-9be4-4765-8e99-f20806a78f1a",
	scheme: "anothertodo",
};

export class AppConfigReader {
	static read(env: Record<string, string | undefined>): AppConfig {
		return {
			apiUrl: AppConfigReader.trimmed(env.EXPO_PUBLIC_API_URL, DEFAULTS.apiUrl),
			authUrl: AppConfigReader.trimmed(env.EXPO_PUBLIC_AUTH_URL, DEFAULTS.authUrl),
			clientId: env.EXPO_PUBLIC_CLIENT_ID || DEFAULTS.clientId,
			microsoftClientId: env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || DEFAULTS.microsoftClientId,
			realtimeUrl: AppConfigReader.trimmed(env.EXPO_PUBLIC_REALTIME_URL, DEFAULTS.realtimeUrl),
			scheme: DEFAULTS.scheme,
		};
	}

	private static trimmed(value: string | undefined, fallback: string): string {
		return (value || fallback).replace(/\/+$/, "");
	}
}
