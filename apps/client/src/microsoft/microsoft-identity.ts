export class MicrosoftIdentity {
	static isMicrosoftAccount(accessToken: string): boolean {
		try {
			const payload = accessToken.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
			const claims = JSON.parse(atob(payload)) as { username?: unknown };
			return typeof claims.username === "string" && claims.username.startsWith("Microsoft_");
		} catch {
			return false;
		}
	}
}
