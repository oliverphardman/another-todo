import { describe, expect, it } from "vitest";
import { createApi, readConfig } from "../src/bootstrap";
import { FakeDocumentClient } from "./support/fake-document-client";
import { event } from "./support/events";

describe("bootstrap", () => {
	it("reads configuration", () => {
		expect(readConfig({ TABLE_NAME: "t", OAUTH_ISSUER: "i" })).toEqual({
			tableName: "t",
			issuer: "i",
		});
	});

	it("rejects missing configuration", () => {
		expect(() => readConfig({ TABLE_NAME: "t" })).toThrow("must be set");
		expect(() => readConfig({ OAUTH_ISSUER: "i" })).toThrow("must be set");
	});

	it("smoke: wires every route", async () => {
		const api = createApi(
			{ tableName: "t", issuer: "https://issuer" },
			new FakeDocumentClient().asClient(),
		);
		expect((await api.handle(event({ path: "/tasks" }))).statusCode).toBe(200);
		expect(
			(await api.handle(event({ path: "/.well-known/oauth-protected-resource", sub: null })))
				.statusCode,
		).toBe(200);
		expect(
			(
				await api.handle(
					event({ method: "POST", path: "/mcp", body: { jsonrpc: "2.0", id: 1, method: "ping" } }),
				)
			).statusCode,
		).toBe(200);
		expect((await api.handle(event({ path: "/missing" }))).statusCode).toBe(404);
	});
});
