import { Connection } from "../domain/connection";
import type { ConnectionRepository } from "../domain/connection-repository";
import type { Clock } from "../application/ports";
import type { Authenticator } from "../http/authenticator";

export interface WebSocketEvent {
	readonly requestContext: { readonly routeKey: string; readonly connectionId: string };
	readonly queryStringParameters?: Readonly<Record<string, string | undefined>> | null;
}

export interface WebSocketResult {
	readonly statusCode: number;
}

export const CONNECTION_LIFETIME_SECONDS = 24 * 60 * 60;

export class WebSocketHandler {
	constructor(
		private readonly authenticator: Authenticator,
		private readonly connections: ConnectionRepository,
		private readonly clock: Clock,
	) {}

	async handle(event: WebSocketEvent): Promise<WebSocketResult> {
		if (event.requestContext.routeKey !== "$connect") {
			return { statusCode: 200 };
		}
		const token = event.queryStringParameters?.token;
		const credentials = {
			header: (name: string) =>
				name.toLowerCase() === "authorization" && token ? `Bearer ${token}` : undefined,
		};
		try {
			const owner = await this.authenticator.authenticate(credentials);
			await this.connections.save(
				Connection.open(
					owner,
					event.requestContext.connectionId,
					this.clock.now(),
					CONNECTION_LIFETIME_SECONDS,
				),
			);
			return { statusCode: 200 };
		} catch {
			return { statusCode: 401 };
		}
	}
}
