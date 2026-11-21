import type { ChangeChannel } from "../../application/change-channel";
import { CHANGED_MESSAGE } from "../../application/change-notifier";
import type { ConnectionRepository } from "../../domain/connection-repository";

export interface ConnectionPusher {
	push(connectionId: string, message: string): Promise<boolean>;
}

export class ApiGatewayChangeChannel implements ChangeChannel {
	constructor(
		private readonly connections: ConnectionRepository,
		private readonly pusher: ConnectionPusher,
	) {}

	async deliver(userId: string): Promise<void> {
		const open = await this.connections.list(userId);
		await Promise.all(
			open.map(async (connection) => {
				const alive = await this.pusher.push(connection.id, CHANGED_MESSAGE).catch(() => true);
				if (!alive) {
					await this.connections.delete(userId, connection.id);
				}
			}),
		);
	}
}
