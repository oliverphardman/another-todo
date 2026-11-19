export interface ConnectionRecord {
	readonly ownerId: string;
	readonly id: string;
	readonly expiresAt: number;
}

export class Connection {
	private constructor(
		readonly ownerId: string,
		readonly id: string,
		readonly expiresAt: number,
	) {}

	static open(ownerId: string, id: string, now: Date, lifetimeSeconds: number): Connection {
		return new Connection(ownerId, id, Math.floor(now.getTime() / 1000) + lifetimeSeconds);
	}

	static restore(record: ConnectionRecord): Connection {
		return new Connection(record.ownerId, record.id, record.expiresAt);
	}

	toRecord(): ConnectionRecord {
		return { ownerId: this.ownerId, id: this.id, expiresAt: this.expiresAt };
	}
}
