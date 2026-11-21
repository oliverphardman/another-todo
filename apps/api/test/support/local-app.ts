import { mkdtempSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import { createApplication, readConfig } from "../../src/bootstrap";
import { PlatformFactory, ProviderRegistries } from "../../src/composition/provider-registry";
import type { Platform } from "../../src/composition/platform";
import { LOCAL_DEFAULTS, localProviders } from "../../src/infrastructure/local/local-providers";
import { SqliteDatabase } from "../../src/infrastructure/local/sqlite-database";
import { sharedProviders } from "../../src/infrastructure/shared/enforced-identity";
import type { Router } from "express";

export interface LocalApp {
	readonly base: string;
	readonly directory: string;
	readonly platform: Platform;
	readonly server: Server;
	close(): Promise<void>;
}

const open: LocalApp[] = [];

afterAll(async () => {
	await Promise.all(open.splice(0).map((app) => app.close()));
});

export async function startLocalApp(
	env: Record<string, string | undefined> = {},
	web: Router | null = null,
): Promise<LocalApp> {
	const directory = mkdtempSync(join(tmpdir(), "atd-local-"));
	const merged = { DATA_DIR: directory, ADMIN_PASSWORD: "admin-password", ...env };
	const config = readConfig(merged, "http://localhost:3000");
	const platform = new PlatformFactory(
		ProviderRegistries.merge(localProviders, sharedProviders),
		LOCAL_DEFAULTS,
	).create(merged, config.publicUrl);
	const server = createApplication(config, platform, web).listen(0, "127.0.0.1");
	platform.realtime.attach(server);
	await new Promise((resolve) => server.once("listening", resolve));
	const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
	const app: LocalApp = {
		base,
		directory,
		platform,
		server,
		close: async () => {
			server.closeAllConnections();
			await new Promise((resolve) => server.close(resolve));
			SqliteDatabase.close(directory);
		},
	};
	open.push(app);
	return app;
}

export async function login(
	app: LocalApp,
	username = "admin",
	password = "admin-password",
): Promise<string> {
	const reply = await fetch(`${app.base}/auth/login`, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ username, password }),
	});
	return ((await reply.json()) as { accessToken: string }).accessToken;
}

export function bearer(token: string, extra: Record<string, string> = {}): Record<string, string> {
	return { authorization: `Bearer ${token}`, ...extra };
}
