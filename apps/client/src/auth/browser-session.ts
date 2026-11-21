export interface BrowserSession {
	readonly redirectUri: string;
	authorize(url: string): Promise<string | null>;
}
