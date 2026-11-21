import type { BrowserSession } from "./browser-session";
import { LinkingDeepLinks, type DeepLinks } from "./deep-links";

const SIGN_IN_TIMEOUT_MS = 5 * 60_000;

export class DeepLinkBrowserSession implements BrowserSession {
	constructor(
		private readonly scheme: string,
		private readonly links: DeepLinks = new LinkingDeepLinks(),
		private readonly timeoutMs: number = SIGN_IN_TIMEOUT_MS,
	) {}

	get redirectUri(): string {
		return `${this.scheme}://auth/callback`;
	}

	async authorize(url: string): Promise<string | null> {
		const waiting = this.links.waitFor(this.redirectUri, this.timeoutMs);
		await this.links.open(url);
		return waiting;
	}
}
