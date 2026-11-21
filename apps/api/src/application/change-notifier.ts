import type { ChangeChannel } from "./change-channel";

export interface PeerSource {
	peers(userId: string): Promise<string[]>;
}

export const CHANGED_MESSAGE = JSON.stringify({ type: "changed" });

export class ChangeNotifier {
	constructor(
		private readonly channel: ChangeChannel,
		private readonly peers: PeerSource,
	) {}

	async notify(ownerId: string): Promise<void> {
		const recipients = [ownerId, ...(await this.peers.peers(ownerId))];
		await Promise.all(recipients.map((recipient) => this.channel.deliver(recipient)));
	}
}
