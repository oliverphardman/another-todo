import { JwtClaims } from "../auth/jwt-claims";

export class MicrosoftIdentity {
	static isMicrosoftAccount(accessToken: string): boolean {
		const claims = JwtClaims.read(accessToken);
		return (
			MicrosoftIdentity.startsWith(claims.username, "microsoft_") ||
			MicrosoftIdentity.startsWith(claims.sub, "microsoft:")
		);
	}

	private static startsWith(claim: unknown, prefix: string): boolean {
		return typeof claim === "string" && claim.toLowerCase().startsWith(prefix);
	}
}
