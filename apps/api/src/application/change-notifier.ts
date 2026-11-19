import type { ConnectionRepository } from "../domain/connection-repository";

export interface ConnectionPusher {
	push(connectionId: string, message: string): Promise<boolean>;
}

export const CHANGED_MESSAGE = JSON.stringify({ type: "changed" });

export class ChangeNotifier {
	constructor(
		private readonly connections: ConnectionRepository,
		private readonly pusher: ConnectionPusher,
	) {}

	async notify(ownerId: string): Promise<void> {
		const open = await this.connections.list(ownerId);
		await Promise.all(
			open.map(async (connection) => {
				const alive = await this.pusher.push(connection.id, CHANGED_MESSAGE).catch(() => true);
				if (!alive) {
					await this.connections.delete(ownerId, connection.id);
				}
			}),
		);
	}
}
