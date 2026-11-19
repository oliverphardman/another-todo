import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("server entry point", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("TABLE_NAME", "tasks");
		vi.stubEnv("LISTS_TABLE_NAME", "lists");
		vi.stubEnv("SETTINGS_TABLE_NAME", "settings");
		vi.stubEnv("PHOTOS_TABLE_NAME", "photos");
		vi.stubEnv("PHOTOS_BUCKET", "photos-bucket");
		vi.stubEnv("COGNITO_USER_POOL_ID", "eu-west-1_abc123");
		vi.stubEnv("COGNITO_CLIENT_ID", "client-1");
		vi.stubEnv("PUBLIC_API_URL", "https://api.example.com");
		vi.stubEnv("AWS_REGION", "eu-west-1");
		vi.stubEnv("AWS_LAMBDA_HTTP_ENDPOINT", "127.0.0.1:0");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("listens on the Lambda HTTP endpoint and stops on SIGTERM", async () => {
		const { server } = await import("../src/main");
		await vi.waitFor(() => expect(server.listening).toBe(true));
		const { port } = server.address() as AddressInfo;
		const response = await fetch(`http://127.0.0.1:${port}/.well-known/oauth-protected-resource`);
		expect(response.status).toBe(200);
		expect((await response.json()).authorization_servers).toEqual([
			"https://cognito-idp.eu-west-1.amazonaws.com/eu-west-1_abc123",
		]);
		const unauthorized = await fetch(`http://127.0.0.1:${port}/tasks`);
		expect(unauthorized.status).toBe(401);
		process.emit("SIGTERM");
		await vi.waitFor(() => expect(server.listening).toBe(false));
	});

	it("fails fast without configuration", async () => {
		vi.stubEnv("COGNITO_CLIENT_ID", "");
		await expect(import("../src/main")).rejects.toThrow("must be set");
	});

	it("fails fast on an invalid listen address", async () => {
		vi.stubEnv("AWS_LAMBDA_HTTP_ENDPOINT", "nonsense");
		await expect(import("../src/main")).rejects.toThrow("Invalid listen address");
	});
});
