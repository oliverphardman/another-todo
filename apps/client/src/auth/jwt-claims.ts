export class JwtClaims {
	static read(token: string): Record<string, unknown> {
		try {
			const payload = token.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
			const text = decodeURIComponent(
				Array.from(
					atob(payload),
					(byte) => `%${byte.charCodeAt(0).toString(16).padStart(2, "0")}`,
				).join(""),
			);
			const claims = JSON.parse(text) as unknown;
			return typeof claims === "object" && claims !== null
				? (claims as Record<string, unknown>)
				: {};
		} catch {
			return {};
		}
	}
}
