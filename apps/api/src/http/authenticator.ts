import { UnauthorizedError } from "../domain/errors";

export interface Credentials {
	header(name: string): string | undefined;
}

export interface Authenticator {
	authenticate(credentials: Credentials): Promise<string>;
}

export interface TokenVerifier {
	verify(token: string): Promise<{ readonly sub: string }>;
}

const BEARER = /^Bearer (\S+)$/i;

export class BearerAuthenticator implements Authenticator {
	constructor(private readonly verifier: TokenVerifier) {}

	async authenticate(credentials: Credentials): Promise<string> {
		const token = BEARER.exec(credentials.header("authorization") ?? "")?.[1];
		if (token === undefined) {
			throw new UnauthorizedError("Authentication required");
		}
		try {
			return (await this.verifier.verify(token)).sub;
		} catch {
			throw new UnauthorizedError("Invalid or expired token");
		}
	}
}
