import { mkdtempSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { directoryOf } from "../src/infrastructure/local/local-providers";
import { SqliteDatabase } from "../src/infrastructure/local/sqlite-database";

describe("self-hosted server entry point", () => {
	let directory: string;

	beforeEach(() => {
		vi.resetModules();
		directory = mkdtempSync(join(tmpdir(), "atd-server-"));
		vi.stubEnv("PORT", "0");
		vi.stubEnv("DATA_DIR", directory);
		vi.stubEnv("ADMIN_PASSWORD", "admin-password");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
		SqliteDatabase.close(directory);
	});

	async function start() {
		const { server } = await import("../src/server");
		await vi.waitFor(() => expect(server.listening).toBe(true));
		return { server, base: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
	}

	it("serves the API with the local providers and stops on SIGTERM", async () => {
		const { server, base } = await start();
		expect(await (await fetch(`${base}/config`)).json()).toEqual({
			authentication: "password",
			notice: null,
			realtimeUrl: null,
		});
		expect((await fetch(`${base}/tasks`)).status).toBe(401);
		expect((await fetch(`${base}/`)).status).toBe(404);
		process.emit("SIGTERM");
		await vi.waitFor(() => expect(server.listening).toBe(false));
	});

	it("hosts the web client when WEB_DIR is set", async () => {
		const web = mkdtempSync(join(tmpdir(), "atd-site-"));
		writeFileSync(join(web, "index.html"), "<html>app</html>");
		vi.stubEnv("WEB_DIR", web);
		vi.stubEnv("ENFORCED_SERVER_URL", "https://todo.example.com");
		const { server, base } = await start();
		expect(await (await fetch(`${base}/`)).text()).toBe("<html>app</html>");
		expect(await (await fetch(`${base}/runtime-config.js`)).text()).toContain(
			'"serverUrl":"https://todo.example.com"',
		);
		server.close();
	});

	it("hosts the web client on the server's own origin by default", async () => {
		const web = mkdtempSync(join(tmpdir(), "atd-site-"));
		vi.stubEnv("WEB_DIR", web);
		const { server, base } = await start();
		expect(await (await fetch(`${base}/runtime-config.js`)).text()).toContain('"serverUrl":""');
		server.close();
	});

	it("runs the demo configuration: enforced user and a notice", async () => {
		vi.stubEnv("AUTH_PROVIDER", "enforced");
		vi.stubEnv("ENFORCED_USERNAME", "demo");
		vi.stubEnv("SERVER_NOTICE", "Shared demo");
		const { server, base } = await start();
		expect((await fetch(`${base}/tasks`)).status).toBe(200);
		server.close();
	});

	it("keeps its data in ./data unless told otherwise", () => {
		expect(directoryOf({})).toBe("./data");
		expect(directoryOf({ DATA_DIR: "/srv/atd" })).toBe("/srv/atd");
	});

	it("fails fast on a bad provider", async () => {
		vi.stubEnv("DATA_PROVIDER", "mongo");
		await expect(import("../src/server")).rejects.toThrow("DATA_PROVIDER must be one of");
	});
});
