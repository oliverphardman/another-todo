import type { DirectoryUser, UserDirectory } from "../../src/application/user-directory";

export class FakeUserDirectory implements UserDirectory {
	private readonly users = new Map<string, DirectoryUser>();

	register(email: string, sub: string): void {
		this.users.set(email, { sub, email });
	}

	async findByEmail(email: string): Promise<DirectoryUser | null> {
		return this.users.get(email) ?? null;
	}
}
