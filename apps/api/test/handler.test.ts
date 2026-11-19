import type { Context } from "aws-lambda";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { event } from "./support/events";

describe("Lambda entry point", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.stubEnv("TABLE_NAME", "tasks");
		vi.stubEnv("LISTS_TABLE_NAME", "lists");
		vi.stubEnv("OAUTH_ISSUER", "https://issuer.example.com");
		vi.stubEnv("AWS_REGION", "eu-west-2");
	});

	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it("builds the API from the environment", async () => {
		const { handler } = await import("../src/handler");
		const reply = (await handler(
			event({ path: "/.well-known/oauth-protected-resource", sub: null }),
			{} as Context,
			() => undefined,
		)) as { statusCode: number };
		expect(reply.statusCode).toBe(200);
	});

	it("fails fast without configuration", async () => {
		vi.stubEnv("TABLE_NAME", "");
		await expect(import("../src/handler")).rejects.toThrow("must be set");
	});
});
