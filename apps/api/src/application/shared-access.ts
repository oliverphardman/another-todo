import { Share } from "../domain/share";
import type { ShareRepository } from "../domain/share-repository";

export class SharedAccess {
	constructor(private readonly shares: ShareRepository) {}

	async memberships(userId: string): Promise<Share[]> {
		return (await this.shares.list(userId)).filter((share) => share.isMembership);
	}

	async membershipFor(userId: string, listId: string): Promise<Share | null> {
		return (await this.memberships(userId)).find((share) => share.listId === listId) ?? null;
	}

	async grantsFor(ownerId: string, listId: string): Promise<Share[]> {
		return (await this.shares.list(ownerId)).filter(
			(share) => share.isGrant && share.listId === listId,
		);
	}

	async sharedKeys(userId: string): Promise<ReadonlySet<string>> {
		const entries = await this.shares.list(userId);
		return new Set(entries.map((share) => `${share.listOwnerId}#${share.listId}`));
	}

	async revoke(listOwnerId: string, listId: string, memberId: string): Promise<void> {
		await this.shares.delete(memberId, Share.membershipId(listOwnerId, listId));
		await this.shares.delete(listOwnerId, Share.grantId(listId, memberId));
	}

	async revokeAll(listOwnerId: string, listId: string): Promise<void> {
		for (const grant of await this.grantsFor(listOwnerId, listId)) {
			await this.revoke(listOwnerId, listId, grant.memberId);
		}
	}

	async peers(userId: string): Promise<string[]> {
		const peers = new Set<string>();
		const entries = await this.shares.list(userId);
		for (const share of entries.filter((entry) => entry.isGrant)) {
			peers.add(share.memberId);
		}
		for (const membership of entries.filter((entry) => entry.isMembership)) {
			peers.add(membership.listOwnerId);
			for (const grant of await this.grantsFor(membership.listOwnerId, membership.listId)) {
				peers.add(grant.memberId);
			}
		}
		peers.delete(userId);
		return [...peers];
	}
}
