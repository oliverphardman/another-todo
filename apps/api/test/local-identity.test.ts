import { createHmac } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Jwt } from "../src/infrastructure/local/jwt";
import { PasswordHasher } from "../src/infrastructure/local/password-hasher";
import { SecretKey } from "../src/infrastructure/local/secret-key";
import { bearer, login, startLocalApp } from "./support/local-app";

const NOW = new Date("2026-11-21T10:00:00Z");
const exp = (seconds: number) => Math.floor(NOW.getTime() / 1000) + seconds;

describe("Jwt", () => {
	const jwt = new Jwt(Buffer.from("secret"));

	it("verifies a token for its audience until it expires", () => {
		const token = jwt.sign({ aud: "a", exp: exp(60), sub: "u" });
		expect(jwt.verify(token, "a", NOW)?.sub).toBe("u");
		expect(jwt.verify(token, "b", NOW)).toBeNull();
		expect(jwt.verify(token, "a", new Date(NOW.getTime() + 61_000))).toBeNull();
	});

	it("rejects tokens that are malformed, forged or signed with another key", () => {
		const token = jwt.sign({ aud: "a", exp: exp(60) });
		const [header, body, signature] = token.split(".");
		expect(jwt.verify("nonsense", "a", NOW)).toBeNull();
		expect(jwt.verify(`x.${body}.${signature}`, "a", NOW)).toBeNull();
		expect(jwt.verify(`${header}.${body}.short`, "a", NOW)).toBeNull();
		expect(jwt.verify(`${header}.${body}.${"A".repeat(signature!.length)}`, "a", NOW)).toBeNull();
		expect(new Jwt(Buffer.from("other")).verify(token, "a", NOW)).toBeNull();
	});

	it("rejects a correctly signed body that is not JSON", () => {
		const header = jwt.sign({ aud: "a", exp: exp(60) }).split(".")[0]!;
		const body = Buffer.from("not json").toString("base64url");
		const signature = createHmac("sha256", "secret")
			.update(`${header}.${body}`)
			.digest("base64url");
		expect(jwt.verify(`${header}.${body}.${signature}`, "a", NOW)).toBeNull();
	});
});

describe("PasswordHasher", () => {
	const hasher = new PasswordHasher();

	it("hashes with a salt and checks the password", () => {
		const stored = hasher.hash("correct horse");
		expect(stored).not.toBe(hasher.hash("correct horse"));
		expect(hasher.matches("correct horse", stored)).toBe(true);
		expect(hasher.matches("wrong", stored)).toBe(false);
	});

	it("refuses stored values it does not understand", () => {
		expect(hasher.matches("x", "plain")).toBe(false);
		expect(hasher.matches("x", "scrypt$00")).toBe(false);
		expect(hasher.matches("x", "scrypt$00$00")).toBe(false);
	});
});

describe("SecretKey", () => {
	it("uses a configured key, otherwise creates one once and keeps it", () => {
		expect(SecretKey.load("/nowhere", "configured").toString()).toBe("configured");
		const directory = join(mkdtempSync(join(tmpdir(), "atd-key-")), "nested");
		const first = SecretKey.load(directory, null);
		expect(first).toHaveLength(32);
		expect(SecretKey.load(directory, null).equals(first)).toBe(true);
		expect(readFileSync(join(directory, "secret.key"), "utf8")).toBe(first.toString("hex"));
	});
});

describe("password identity", () => {
	const post = (base: string, path: string, body: unknown, headers: Record<string, string> = {}) =>
		fetch(`${base}${path}`, {
			method: "POST",
			headers: { "content-type": "application/json", ...headers },
			body: JSON.stringify(body),
		});

	it("signs in with the admin password and rejects anything else", async () => {
		const app = await startLocalApp();
		expect((await post(app.base, "/auth/login", { username: "admin", password: "x" })).status).toBe(
			401,
		);
		expect(
			(await post(app.base, "/auth/login", { username: "nobody", password: "x" })).status,
		).toBe(401);
		expect((await post(app.base, "/auth/login", {})).status).toBe(401);
		const reply = await post(app.base, "/auth/login", {
			username: "admin",
			password: "admin-password",
		});
		const body = (await reply.json()) as { accessToken: string; tokenType: string };
		expect(reply.status).toBe(200);
		expect(body.tokenType).toBe("Bearer");
		const tasks = await fetch(`${app.base}/tasks`, { headers: bearer(body.accessToken) });
		expect(tasks.status).toBe(200);
		expect((await fetch(`${app.base}/tasks`)).status).toBe(401);
		expect((await fetch(`${app.base}/tasks`, { headers: bearer("forged") })).status).toBe(401);
	});

	it("reports an absent body as a failed sign in", async () => {
		const app = await startLocalApp();
		expect((await fetch(`${app.base}/auth/login`, { method: "POST" })).status).toBe(401);
	});

	it("lets only an administrator create accounts and shares lists with them", async () => {
		const app = await startLocalApp();
		const admin = await login(app);
		const create = (body: unknown, token?: string) =>
			post(app.base, "/auth/users", body, token === undefined ? {} : bearer(token));
		expect((await create({ username: "sam", password: "long enough" })).status).toBe(403);
		expect((await create({ username: "bad name", password: "long enough" }, admin)).status).toBe(
			400,
		);
		expect((await create({ username: "sam", password: "short" }, admin)).status).toBe(400);
		expect(
			(await create({ username: "sam", password: "long enough", email: 5 }, admin)).status,
		).toBe(400);
		const created = await create(
			{ username: "sam", password: "long enough", email: "sam@x.com" },
			admin,
		);
		expect(created.status).toBe(201);
		expect(await created.json()).toEqual({ username: "sam", email: "sam@x.com" });
		expect((await create({ username: "sam", password: "long enough" }, admin)).status).toBe(400);
		const plain = await create({ username: "pat", password: "long enough" }, admin);
		expect(((await plain.json()) as { email: unknown }).email).toBeNull();
		const sam = await login(app, "sam", "long enough");
		expect((await create({ username: "lee", password: "long enough" }, sam)).status).toBe(403);
		expect(await app.platform.identity.directory.findByEmail("SAM@x.com")).toEqual({
			sub: "sam",
			email: "SAM@x.com",
		});
		expect(await app.platform.identity.directory.findByEmail("pat")).toEqual({
			sub: "pat",
			email: "pat",
		});
		expect(await app.platform.identity.directory.findByEmail("nobody@x.com")).toBeNull();
	});

	it("rejects a token whose account no longer exists", async () => {
		const app = await startLocalApp();
		const jwt = new Jwt(SecretKey.load(app.directory, null));
		const ghost = jwt.sign({ aud: "access", sub: "ghost", exp: exp(1_000_000_000) });
		expect((await fetch(`${app.base}/tasks`, { headers: bearer(ghost) })).status).toBe(401);
	});

	it("generates an admin password when none is given and keeps an existing one", async () => {
		const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);
		const directory = mkdtempSync(join(tmpdir(), "atd-admin-"));
		const first = await startLocalApp({ DATA_DIR: directory, ADMIN_PASSWORD: undefined });
		const announced = write.mock.calls.map(([message]) => String(message)).join("");
		expect(announced).toMatch(/Created the admin account with the password \S+/);
		const generated = /password (\S+)/.exec(announced)![1]!;
		expect(await login(first, "admin", generated)).toBeTruthy();
		await first.close();
		write.mockClear();
		const second = await startLocalApp({ DATA_DIR: directory, ADMIN_PASSWORD: undefined });
		expect(write).not.toHaveBeenCalled();
		expect(await login(second, "admin", generated)).toBeTruthy();
		await second.close();
		const reset = await startLocalApp({ DATA_DIR: directory, ADMIN_PASSWORD: "brand new" });
		expect(await login(reset, "admin", "brand new")).toBeTruthy();
		expect(await login(reset, "admin", generated)).toBeUndefined();
		write.mockRestore();
	});
});
