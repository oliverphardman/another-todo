import type { Fetcher } from "../api/authorized-http";
import type { IdentityProvider } from "../auth/authorization-server";
import type { Authentication, ServerInfo } from "./app-config";

const MODES: readonly Authentication[] = ["none", "password", "external"];

export class ServerUnreachableError extends Error {
	constructor(readonly serverUrl: string) {
		super(`Could not reach ${serverUrl}`);
	}
}

export class ServerInfoLoader {
	constructor(private readonly fetcher: Fetcher = (input, init) => fetch(input, init)) {}

	async load(serverUrl: string): Promise<ServerInfo> {
		try {
			const response = await this.fetcher(`${serverUrl}/config`);
			const body = (await response.json()) as Partial<ServerInfo>;
			if (!response.ok || !MODES.includes(body.authentication as Authentication)) {
				throw new ServerUnreachableError(serverUrl);
			}
			return {
				authentication: body.authentication!,
				providers: (Array.isArray(body.providers) ? body.providers : []).filter(
					(provider): provider is IdentityProvider =>
						provider === "Microsoft" || provider === "Google",
				),
				notice: typeof body.notice === "string" ? body.notice : null,
				realtimeUrl: typeof body.realtimeUrl === "string" ? body.realtimeUrl : null,
			};
		} catch {
			throw new ServerUnreachableError(serverUrl);
		}
	}
}
