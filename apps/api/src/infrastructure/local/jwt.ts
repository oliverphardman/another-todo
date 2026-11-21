import { createHmac, timingSafeEqual } from "node:crypto";

export interface JwtClaims {
	readonly aud: string;
	readonly exp: number;
	readonly [claim: string]: unknown;
}

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

export class Jwt {
	constructor(private readonly secret: Buffer) {}

	sign(claims: JwtClaims): string {
		const body = `${HEADER}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
		return `${body}.${this.signature(body)}`;
	}

	verify(token: string, audience: string, now: Date): JwtClaims | null {
		const parts = token.split(".");
		if (parts.length !== 3 || parts[0] !== HEADER) {
			return null;
		}
		const body = `${parts[0]}.${parts[1]}`;
		const expected = Buffer.from(this.signature(body));
		const actual = Buffer.from(parts[2]!);
		if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
			return null;
		}
		try {
			const claims = JSON.parse(Buffer.from(parts[1]!, "base64url").toString()) as JwtClaims;
			return claims.aud === audience && claims.exp * 1000 > now.getTime() ? claims : null;
		} catch {
			return null;
		}
	}

	private signature(body: string): string {
		return createHmac("sha256", this.secret).update(body).digest("base64url");
	}
}
