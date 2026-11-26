export class MicrosoftIdentity {
	static isMicrosoftAccount(accessToken: string): boolean {
		try {
			const payload = accessToken.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
			const claims = JSON.parse(atob(payload)) as { username?: unknown; sub?: unknown };
			return (
				MicrosoftIdentity.startsWith(claims.username, "microsoft_") ||
				MicrosoftIdentity.startsWith(claims.sub, "microsoft:")
			);
		} catch {
			return false;
		}
	}

	private static startsWith(claim: unknown, prefix: string): boolean {
		return typeof claim === "string" && claim.toLowerCase().startsWith(prefix);
	}
}
