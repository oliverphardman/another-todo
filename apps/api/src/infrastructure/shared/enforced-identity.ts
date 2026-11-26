import type { Authenticator } from "../../http/authenticator";
import { Settings } from "../../composition/env";
import type { Env, Identity } from "../../composition/platform";
import type { UserDirectory } from "../../application/user-directory";

export class EnforcedAuthenticator implements Authenticator {
	constructor(private readonly username: string) {}

	async authenticate(): Promise<string> {
		return this.username;
	}
}

export class NoUserDirectory implements UserDirectory {
	async findByEmail(): Promise<null> {
		return null;
	}
}

export function enforced(env: Env): Identity {
	const { ENFORCED_USERNAME } = new Settings(env).require("ENFORCED_USERNAME");
	return {
		mode: "none",
		providers: [],
		authenticator: new EnforcedAuthenticator(ENFORCED_USERNAME),
		directory: new NoUserDirectory(),
		issuer: null,
		signIn: null,
		router: null,
	};
}

export const sharedProviders = { identity: { enforced } };
