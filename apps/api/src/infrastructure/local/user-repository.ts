import type { DatabaseSync } from "node:sqlite";

export interface UserAccount {
	readonly username: string;
	readonly email: string | null;
	readonly passwordHash: string;
	readonly admin: boolean;
}

interface UserRow {
	username: string;
	email: string | null;
	password_hash: string;
	admin: number;
}

export class UserRepository {
	constructor(private readonly connection: DatabaseSync) {}

	save(user: UserAccount): void {
		this.connection
			.prepare(
				"INSERT INTO users (username, email, password_hash, admin) VALUES (?, ?, ?, ?) ON CONFLICT (username) DO UPDATE SET email = excluded.email, password_hash = excluded.password_hash, admin = excluded.admin",
			)
			.run(user.username, user.email, user.passwordHash, user.admin ? 1 : 0);
	}

	findByUsername(username: string): UserAccount | null {
		return this.toAccount(
			this.connection.prepare("SELECT * FROM users WHERE username = ?").get(username),
		);
	}

	findByEmail(email: string): UserAccount | null {
		return this.toAccount(
			this.connection
				.prepare("SELECT * FROM users WHERE lower(email) = lower(?) OR lower(username) = lower(?)")
				.get(email, email),
		);
	}

	private toAccount(row: unknown): UserAccount | null {
		if (row === undefined) {
			return null;
		}
		const { username, email, password_hash, admin } = row as UserRow;
		return { username, email, passwordHash: password_hash, admin: admin === 1 };
	}
}
