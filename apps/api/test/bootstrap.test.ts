import { describe, expect, it } from "vitest";
import { readConfig } from "../src/bootstrap";
import { ApiGatewayAuthenticator } from "../src/http/authenticator";

describe("bootstrap", () => {
	it("reads configuration", () => {
		expect(readConfig({ TABLE_NAME: "t", LISTS_TABLE_NAME: "l", OAUTH_ISSUER: "i" })).toEqual({
			tableName: "t",
			listsTableName: "l",
			issuer: "i",
		});
	});

	it("rejects missing configuration", () => {
		expect(() => readConfig({ TABLE_NAME: "t", LISTS_TABLE_NAME: "l" })).toThrow("must be set");
		expect(() => readConfig({ LISTS_TABLE_NAME: "l", OAUTH_ISSUER: "i" })).toThrow("must be set");
	});

	it("rejects authentication outside a Lambda invocation", () => {
		expect(() => new ApiGatewayAuthenticator().subjectOf({} as never)).toThrow(
			"Authentication required",
		);
	});
});
