import { describe, expect, it } from "vitest";
import {
	MethodNotAllowedError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "../src/domain/errors";
import { ApiRouter } from "../src/http/api-router";
import { DiscoveryHandler } from "../src/http/discovery-handler";
import type { RouteHandler } from "../src/http/types";
import { event } from "./support/events";

class ThrowingHandler implements RouteHandler {
	constructor(private readonly error: unknown) {}

	canHandle(): boolean {
		return true;
	}

	async handle(): Promise<never> {
		throw this.error;
	}
}

describe("ApiRouter", () => {
	it("returns 404 for unknown paths", async () => {
		const result = await new ApiRouter([]).handle(event({ path: "/nope" }));
		expect(result.statusCode).toBe(404);
	});

	it.each([
		[new ValidationError("v"), 400],
		[new UnauthorizedError("u"), 401],
		[new NotFoundError("n"), 404],
		[new MethodNotAllowedError("m"), 405],
		[new Error("secret"), 500],
	])("maps %s to %i", async (error, status) => {
		const result = await new ApiRouter([new ThrowingHandler(error)]).handle(event({ path: "/x" }));
		expect(result.statusCode).toBe(status);
		expect(result.body).not.toContain("secret");
	});

	it("serves protected resource metadata", async () => {
		const router = new ApiRouter([new DiscoveryHandler("https://issuer")]);
		const result = await router.handle(
			event({ path: "/.well-known/oauth-protected-resource", sub: null }),
		);
		expect(JSON.parse(result.body)).toEqual({
			resource: "https://api.example.com/mcp",
			authorization_servers: ["https://issuer"],
			bearer_methods_supported: ["header"],
		});
	});
});
