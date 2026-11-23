export interface AttachmentRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly taskId: string;
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
	readonly createdAt: string;
}

export interface AttachmentDetails {
	readonly taskId: string;
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
}

export class Attachment {
	private constructor(
		readonly ownerId: string,
		readonly id: string,
		readonly taskId: string,
		readonly name: string,
		readonly contentType: string,
		readonly size: number,
		readonly createdAt: Date,
	) {}

	static create(
		ownerId: string,
		id: string,
		details: AttachmentDetails,
		createdAt: Date,
	): Attachment {
		return new Attachment(
			ownerId,
			id,
			details.taskId,
			details.name,
			details.contentType,
			details.size,
			createdAt,
		);
	}

	static restore(record: AttachmentRecord): Attachment {
		return new Attachment(
			record.ownerId,
			record.id,
			record.taskId,
			record.name,
			record.contentType,
			record.size,
			new Date(record.createdAt),
		);
	}

	get storageKey(): string {
		return `${this.ownerId}/attachments/${this.id}`;
	}

	toRecord(): AttachmentRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			taskId: this.taskId,
			name: this.name,
			contentType: this.contentType,
			size: this.size,
			createdAt: this.createdAt.toISOString(),
		};
	}

	toView(url: string): Omit<AttachmentRecord, "ownerId"> & { readonly url: string } {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return { ...view, url };
	}
}
