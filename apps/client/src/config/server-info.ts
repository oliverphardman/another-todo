import type { Fetcher } from "../api/authorized-http";
import { UNADVERTISED_UPLOAD_BYTES } from "../attachments/upload-limit";
import type { IdentityProvider } from "../auth/authorization-server";
import type { Authentication, ServerInfo, SignInSettings } from "./app-config";

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
			const signIn = ServerInfoLoader.signIn(body.signIn);
			if (body.authentication === "external" && signIn === null) {
				throw new ServerUnreachableError(serverUrl);
			}
			return {
				authentication: body.authentication!,
				providers: (Array.isArray(body.providers) ? body.providers : []).filter(
					(provider): provider is IdentityProvider => provider === "Microsoft",
				),
				notice: typeof body.notice === "string" ? body.notice : null,
				realtimeUrl: typeof body.realtimeUrl === "string" ? body.realtimeUrl : null,
				signIn,
				maxUploadBytes:
					typeof body.maxUploadBytes === "number" && body.maxUploadBytes > 0
						? body.maxUploadBytes
						: UNADVERTISED_UPLOAD_BYTES,
				defaultSettings: body.defaultSettings ?? null,
				presetThemes: body.presetThemes === true,
			};
		} catch {
			throw new ServerUnreachableError(serverUrl);
		}
	}

	private static signIn(value: Partial<SignInSettings> | null | undefined): SignInSettings | null {
		const { url, clientId } = value ?? {};
		return typeof url === "string" && url.startsWith("https://") && typeof clientId === "string"
			? { url, clientId }
			: null;
	}
}
