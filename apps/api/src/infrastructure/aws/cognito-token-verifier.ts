import { CognitoJwtVerifier } from "aws-jwt-verify";
import type { Jwks } from "aws-jwt-verify/jwk";
import type { TokenVerifier } from "../../http/authenticator";

export class CognitoTokenVerifier implements TokenVerifier {
	private readonly verifier;

	constructor(
		private readonly userPoolId: string,
		clientId: string,
	) {
		this.verifier = CognitoJwtVerifier.create({ userPoolId, clientId, tokenUse: "access" });
	}

	get issuer(): string {
		return `https://cognito-idp.${this.userPoolId.split("_")[0]}.amazonaws.com/${this.userPoolId}`;
	}

	cacheJwks(jwks: Jwks): void {
		this.verifier.cacheJwks(jwks);
	}

	async verify(token: string): Promise<{ readonly sub: string }> {
		const payload = await this.verifier.verify(token);
		return { sub: payload.sub };
	}
}
