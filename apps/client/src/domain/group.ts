export interface GroupData {
	readonly id: string;
	readonly name: string;
	readonly createdAt: string;
	readonly position?: number;
}

export class Group {
	constructor(readonly data: GroupData) {}

	static create(id: string, name: string, createdAt: string): Group {
		return new Group({ id, name, createdAt, position: Group.epoch(createdAt) });
	}

	private static epoch(createdAt: string): number {
		const parsed = Date.parse(createdAt);
		return Number.isNaN(parsed) ? 0 : parsed;
	}

	get id(): string {
		return this.data.id;
	}

	get name(): string {
		return this.data.name;
	}

	get position(): number {
		return this.data.position ?? Group.epoch(this.data.createdAt);
	}

	rename(name: string): Group {
		return new Group({ ...this.data, name });
	}
}
