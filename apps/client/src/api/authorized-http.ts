import { ApiError, NetworkError } from "./errors";

export interface TokenProvider {
	getAccessToken(): Promise<string>;
}

export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class AuthorizedHttp {
	constructor(
		private readonly baseUrl: string,
		private readonly tokens: TokenProvider,
		private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
	) {}

	async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const token = await this.tokens.getAccessToken();
		let response: Response;
		try {
			response = await this.fetcher(`${this.baseUrl}${path}`, {
				method,
				headers: {
					authorization: `Bearer ${token}`,
					...(body !== undefined && { "content-type": "application/json" }),
				},
				body: body === undefined ? undefined : JSON.stringify(body),
			});
		} catch {
			throw new NetworkError();
		}
		if (!response.ok) {
			throw new ApiError(response.status, await AuthorizedHttp.messageOf(response));
		}
		return (response.status === 204 ? undefined : await response.json()) as T;
	}

	private static async messageOf(response: Response): Promise<string> {
		try {
			const payload = (await response.json()) as { error?: string };
			return payload.error ?? response.statusText;
		} catch {
			return response.statusText;
		}
	}
}
