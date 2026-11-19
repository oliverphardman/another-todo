import { createSign, generateKeyPairSync } from "node:crypto";
import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "../src/domain/errors";
import { BearerAuthenticator, type TokenVerifier } from "../src/http/authenticator";
import { CognitoTokenVerifier } from "../src/infrastructure/cognito-token-verifier";

const POOL = "eu-west-1_abc123";
const CLIENT = "client-1";
const ISSUER = `https://cognito-idp.eu-west-1.amazonaws.com/${POOL}`;

function request(authorization?: string): Request {
	return { header: () => authorization } as unknown as Request;
}

class StubVerifier implements TokenVerifier {
	async verify(token: string): Promise<{ sub: string }> {
		if (token === "good") {
			return { sub: "user-1" };
		}
		throw new Error("bad token");
	}
}

describe("BearerAuthenticator", () => {
	const authenticator = new BearerAuthenticator(new StubVerifier());

	it("returns the subject of a valid bearer token", async () => {
		expect(await authenticator.authenticate(request("Bearer good"))).toBe("user-1");
		expect(await authenticator.authenticate(request("bearer good"))).toBe("user-1");
	});

	it("rejects missing or malformed headers", async () => {
		for (const header of [undefined, "", "Basic abc", "Bearer", "Bearer a b"]) {
			await expect(authenticator.authenticate(request(header))).rejects.toThrow(
				"Authentication required",
			);
		}
	});

	it("rejects tokens the verifier refuses", async () => {
		await expect(authenticator.authenticate(request("Bearer bad"))).rejects.toThrow(
			UnauthorizedError,
		);
	});
});

describe("CognitoTokenVerifier", () => {
	const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
	const jwk = { ...publicKey.export({ format: "jwk" }), kid: "kid-1", alg: "RS256", use: "sig" };

	function sign(claims: Record<string, unknown>): string {
		const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
		const now = Math.floor(Date.now() / 1000);
		const payload = {
			sub: "user-1",
			iss: ISSUER,
			client_id: CLIENT,
			token_use: "access",
			iat: now,
			exp: now + 600,
			...claims,
		};
		const signingInput = `${encode({ alg: "RS256", kid: "kid-1", typ: "JWT" })}.${encode(payload)}`;
		const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey, "base64url");
		return `${signingInput}.${signature}`;
	}

	function verifier(): CognitoTokenVerifier {
		const instance = new CognitoTokenVerifier(POOL, CLIENT);
		instance.cacheJwks({ keys: [jwk as never] });
		return instance;
	}

	it("derives the issuer from the user pool id", () => {
		expect(verifier().issuer).toBe(ISSUER);
	});

	it("accepts a correctly signed access token", async () => {
		expect(await verifier().verify(sign({}))).toEqual({ sub: "user-1" });
	});

	it("rejects wrong issuer, client, token use and expiry", async () => {
		const v = verifier();
		const past = Math.floor(Date.now() / 1000) - 3600;
		await expect(v.verify(sign({ iss: "https://evil.example.com" }))).rejects.toThrow();
		await expect(v.verify(sign({ client_id: "other" }))).rejects.toThrow();
		await expect(v.verify(sign({ token_use: "id" }))).rejects.toThrow();
		await expect(v.verify(sign({ exp: past, iat: past - 600 }))).rejects.toThrow();
	});

	it("rejects tokens signed with another key", async () => {
		const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
		const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "kid-1" })).toString(
			"base64url",
		);
		const now = Math.floor(Date.now() / 1000);
		const body = Buffer.from(
			JSON.stringify({
				sub: "x",
				iss: ISSUER,
				client_id: CLIENT,
				token_use: "access",
				exp: now + 60,
			}),
		).toString("base64url");
		const signature = createSign("RSA-SHA256")
			.update(`${header}.${body}`)
			.sign(other.privateKey, "base64url");
		await expect(verifier().verify(`${header}.${body}.${signature}`)).rejects.toThrow();
	});
});
