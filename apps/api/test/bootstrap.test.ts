import { describe, expect, it } from "vitest";
import { readConfig } from "../src/bootstrap";
import { ApiGatewayAuthenticator } from "../src/http/authenticator";

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

	it("rejects authentication outside a Lambda invocation", () => {
		expect(() => new ApiGatewayAuthenticator().subjectOf({} as never)).toThrow(
			"Authentication required",
		);
	});
});
