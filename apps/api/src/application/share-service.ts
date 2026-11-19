import { ForbiddenError, NotFoundError, ValidationError } from "../domain/errors";
import { Share } from "../domain/share";
import type { ShareRepository } from "../domain/share-repository";
import type { TodoListRepository } from "../domain/todo-list-repository";
import type { Clock } from "./ports";
import type { SharedAccess } from "./shared-access";
import type { UserDirectory } from "./user-directory";

export class ShareService {
	constructor(
		private readonly shares: ShareRepository,
		private readonly lists: TodoListRepository,
		private readonly access: SharedAccess,
		private readonly directory: UserDirectory,
		private readonly clock: Clock,
	) {}

	async add(ownerId: string, listId: string, email: unknown): Promise<Share> {
		if (typeof email !== "string" || email.trim().length === 0) {
			throw new ValidationError("email must be a non-empty string");
		}
		await this.requireOwnedList(ownerId, listId);
		const user = await this.directory.findByEmail(email.trim());
		if (user === null) {
			throw new NotFoundError("No account was found for that email address");
		}
		if (user.sub === ownerId) {
			throw new ValidationError("You already own this list");
		}
		const now = this.clock.now();
		await this.shares.save(Share.membership(ownerId, listId, user.sub, user.email, now));
		const grant = Share.grant(ownerId, listId, user.sub, user.email, now);
		await this.shares.save(grant);
		return grant;
	}

	async list(userId: string, listId: string): Promise<Share[]> {
		const ownerId = await this.ownerOf(userId, listId);
		return (await this.access.grantsFor(ownerId, listId)).sort(
			(a, b) =>
				a.toRecord().createdAt.localeCompare(b.toRecord().createdAt) ||
				a.memberId.localeCompare(b.memberId),
		);
	}

	async remove(userId: string, listId: string, memberId: string): Promise<void> {
		const ownerId = await this.ownerOf(userId, listId);
		if (ownerId !== userId && memberId !== userId) {
			throw new ForbiddenError("Only the owner can remove other people from a shared list");
		}
		await this.access.revoke(ownerId, listId, memberId);
	}

	async sharedKeys(userId: string): Promise<ReadonlySet<string>> {
		return this.access.sharedKeys(userId);
	}

	peers(userId: string): Promise<string[]> {
		return this.access.peers(userId);
	}

	private async requireOwnedList(ownerId: string, listId: string): Promise<void> {
		if ((await this.lists.findById(ownerId, listId)) !== null) {
			return;
		}
		if ((await this.access.membershipFor(ownerId, listId)) !== null) {
			throw new ForbiddenError("Only the owner can share a list");
		}
		throw new NotFoundError(`List ${listId} not found`);
	}

	private async ownerOf(userId: string, listId: string): Promise<string> {
		if ((await this.lists.findById(userId, listId)) !== null) {
			return userId;
		}
		const membership = await this.access.membershipFor(userId, listId);
		if (membership === null) {
			throw new NotFoundError(`List ${listId} not found`);
		}
		return membership.listOwnerId;
	}
}
