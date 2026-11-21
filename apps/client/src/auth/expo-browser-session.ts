import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import type { BrowserSession } from "./browser-session";

export class ExpoBrowserSession implements BrowserSession {
	constructor(private readonly scheme: string) {}

	get redirectUri(): string {
		return AuthSession.makeRedirectUri({ scheme: this.scheme, path: "auth/callback" });
	}

	async authorize(url: string): Promise<string | null> {
		const result = await WebBrowser.openAuthSessionAsync(url, this.redirectUri);
		return result.type === "success" ? result.url : null;
	}
}
