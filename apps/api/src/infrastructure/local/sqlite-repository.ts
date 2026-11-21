import type { DatabaseSync } from "node:sqlite";

export interface RecordCodec<E, R> {
	toRecord(entity: E): R;
	restore(record: R): E;
}

export class SqliteRepository<E extends { ownerId: string; id: string }, R> {
	constructor(
		private readonly connection: DatabaseSync,
		private readonly table: string,
		private readonly codec: RecordCodec<E, R>,
	) {}

	async save(entity: E): Promise<void> {
		this.connection
			.prepare(
				`INSERT INTO ${this.table} (owner_id, id, record) VALUES (?, ?, ?) ON CONFLICT (owner_id, id) DO UPDATE SET record = excluded.record`,
			)
			.run(entity.ownerId, entity.id, JSON.stringify(this.codec.toRecord(entity)));
	}

	async findById(ownerId: string, id: string): Promise<E | null> {
		const row = this.connection
			.prepare(`SELECT record FROM ${this.table} WHERE owner_id = ? AND id = ?`)
			.get(ownerId, id) as { record: string } | undefined;
		return row === undefined ? null : this.restore(row.record);
	}

	async list(ownerId: string): Promise<E[]> {
		const rows = this.connection
			.prepare(`SELECT record FROM ${this.table} WHERE owner_id = ? ORDER BY id`)
			.all(ownerId) as { record: string }[];
		return rows.map((row) => this.restore(row.record));
	}

	async delete(ownerId: string, id: string): Promise<void> {
		this.connection
			.prepare(`DELETE FROM ${this.table} WHERE owner_id = ? AND id = ?`)
			.run(ownerId, id);
	}

	private restore(record: string): E {
		return this.codec.restore(JSON.parse(record) as R);
	}
}
