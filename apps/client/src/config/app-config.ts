export interface DemoUser {
	readonly region: string;
	readonly username: string;
	readonly password: string;
}

export interface AppConfig {
	readonly apiUrl: string;
	readonly authUrl: string;
	readonly clientId: string;
	readonly realtimeUrl: string;
	readonly microsoftClientId: string;
	readonly scheme: string;
	readonly demo: DemoUser | null;
}

const DEFAULTS = {
	apiUrl: "https://api.itsanotherdemo.app",
	authUrl: "https://auth.itsanotherdemo.app",
	clientId: "rm2gcmocak3qo442q9p0r191q",
	realtimeUrl: "wss://s1gss3s4qg.execute-api.eu-west-1.amazonaws.com/dev",
	microsoftClientId: "dbb91251-9be4-4765-8e99-f20806a78f1a",
	scheme: "anothertodo",
	demo: {
		region: "eu-west-1",
		username: "default@itsanotherdemo.app",
		password: "DefaultDemoUser2026",
	},
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
			demo: env.EXPO_PUBLIC_DEMO === "false" ? null : DEFAULTS.demo,
		};
	}

	private static trimmed(value: string | undefined, fallback: string): string {
		return (value || fallback).replace(/\/+$/, "");
	}
}
