export interface DirectoryUser {
	readonly sub: string;
	readonly email: string;
}

export interface UserDirectory {
	findByEmail(email: string): Promise<DirectoryUser | null>;
}
