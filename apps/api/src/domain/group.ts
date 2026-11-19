import { ValidationError } from "./errors";

export interface GroupRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
	readonly position?: number;
}

interface GroupFields {
	readonly ownerId: string;
	readonly id: string;
	readonly name: string;
	readonly createdAt: Date;
	readonly position: number;
}

export class Group {
	private constructor(private readonly fields: GroupFields) {}

	static create(ownerId: string, id: string, name: string, createdAt: Date): Group {
		return new Group({
			ownerId,
			id,
			name: Group.validateName(name),
			createdAt,
			position: createdAt.getTime(),
		});
	}

	static restore(record: GroupRecord): Group {
		const createdAt = new Date(record.createdAt);
		return new Group({
			ownerId: record.ownerId,
			id: record.id,
			name: record.name,
			createdAt,
			position: record.position ?? createdAt.getTime(),
		});
	}

	private static validateName(name: string): string {
		const trimmed = name.trim();
		if (trimmed.length === 0) {
			throw new ValidationError("Group name must not be empty");
		}
		return trimmed;
	}

	get ownerId(): string {
		return this.fields.ownerId;
	}

	get id(): string {
		return this.fields.id;
	}

	get name(): string {
		return this.fields.name;
	}

	get createdAt(): Date {
		return this.fields.createdAt;
	}

	get position(): number {
		return this.fields.position;
	}

	rename(name: string): Group {
		return new Group({ ...this.fields, name: Group.validateName(name) });
	}

	moveTo(position: number): Group {
		if (!Number.isFinite(position)) {
			throw new ValidationError("position must be a number");
		}
		return new Group({ ...this.fields, position });
	}

	toRecord(): GroupRecord {
		return {
			ownerId: this.ownerId,
			id: this.id,
			name: this.name,
			createdAt: this.createdAt.toISOString(),
			position: this.position,
		};
	}

	toJSON(): Omit<GroupRecord, "ownerId"> {
		const { ownerId: _ownerId, ...view } = this.toRecord();
		return view;
	}
}
