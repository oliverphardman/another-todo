export interface ShareRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly listOwnerId: string;
	readonly listId: string;
	readonly memberId: string;
	readonly email: string;
	readonly createdAt: string;
}

export class Share {
	private constructor(private readonly record: ShareRecord) {}

	static membership(
		listOwnerId: string,
		listId: string,
		memberId: string,
		email: string,
		createdAt: Date,
	): Share {
		return new Share({
			ownerId: memberId,
			id: `m:${listOwnerId}#${listId}`,
			listOwnerId,
			listId,
			memberId,
			email,
			createdAt: createdAt.toISOString(),
		});
	}

	static grant(
		listOwnerId: string,
		listId: string,
		memberId: string,
		email: string,
		createdAt: Date,
	): Share {
		return new Share({
			ownerId: listOwnerId,
			id: `g:${listId}#${memberId}`,
			listOwnerId,
			listId,
			memberId,
			email,
			createdAt: createdAt.toISOString(),
		});
	}

	static membershipId(listOwnerId: string, listId: string): string {
		return `m:${listOwnerId}#${listId}`;
	}

	static grantId(listId: string, memberId: string): string {
		return `g:${listId}#${memberId}`;
	}

	static restore(record: ShareRecord): Share {
		return new Share(record);
	}

	get ownerId(): string {
		return this.record.ownerId;
	}

	get id(): string {
		return this.record.id;
	}

	get listOwnerId(): string {
		return this.record.listOwnerId;
	}

	get listId(): string {
		return this.record.listId;
	}

	get memberId(): string {
		return this.record.memberId;
	}

	get email(): string {
		return this.record.email;
	}

	get isMembership(): boolean {
		return this.record.id.startsWith("m:");
	}

	get isGrant(): boolean {
		return this.record.id.startsWith("g:");
	}

	toRecord(): ShareRecord {
		return this.record;
	}

	toJSON(): { readonly id: string; readonly email: string; readonly createdAt: string } {
		return { id: this.record.memberId, email: this.record.email, createdAt: this.record.createdAt };
	}
}
