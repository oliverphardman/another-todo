export interface PhotoRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
	readonly createdAt: string;
}

export class Photo {
	private constructor(
		readonly ownerId: string,
		readonly id: string,
		readonly name: string,
		readonly contentType: string,
		readonly size: number,
		readonly createdAt: Date,
	) {}

	static create(
		ownerId: string,
		id: string,
		details: { readonly name: string; readonly contentType: string; readonly size: number },
		createdAt: Date,
	): Photo {
		return new Photo(ownerId, id, details.name, details.contentType, details.size, createdAt);
	}

	static restore(record: PhotoRecord): Photo {
		return new Photo(
			record.ownerId,
			record.id,
			record.name,
			record.contentType,
			record.size,
			new Date(record.createdAt),
		);
	}

	get storageKey(): string {
		return `${this.ownerId}/${this.id}`;
	}

	toRecord(): PhotoRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			name: this.name,
			contentType: this.contentType,
			size: this.size,
			createdAt: this.createdAt.toISOString(),
		};
	}

	toView(url: string): Omit<PhotoRecord, "ownerId"> & { readonly url: string } {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return { ...view, url };
	}
}
