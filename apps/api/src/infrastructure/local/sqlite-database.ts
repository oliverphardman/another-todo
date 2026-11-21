import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const AGGREGATE_TABLES = [
	"tasks",
	"lists",
	"groups",
	"shares",
	"photos",
	"settings",
] as const;

export class SqliteDatabase {
	private static readonly open = new Map<string, SqliteDatabase>();

	private constructor(readonly connection: DatabaseSync) {
		connection.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
		for (const table of AGGREGATE_TABLES) {
			connection.exec(
				`CREATE TABLE IF NOT EXISTS ${table} (owner_id TEXT NOT NULL, id TEXT NOT NULL, record TEXT NOT NULL, PRIMARY KEY (owner_id, id))`,
			);
		}
		connection.exec(
			"CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, email TEXT, password_hash TEXT NOT NULL, admin INTEGER NOT NULL)",
		);
	}

	static in(directory: string): SqliteDatabase {
		const root = resolve(directory);
		let database = SqliteDatabase.open.get(root);
		if (database === undefined) {
			mkdirSync(root, { recursive: true });
			database = new SqliteDatabase(new DatabaseSync(join(root, "another-todo.db")));
			SqliteDatabase.open.set(root, database);
		}
		return database;
	}

	static close(directory: string): void {
		const root = resolve(directory);
		SqliteDatabase.open.get(root)?.connection.close();
		SqliteDatabase.open.delete(root);
	}
}
