import { describe, expect, it } from "vitest";
import { readConfig } from "../src/bootstrap";

const base = {
	TABLE_NAME: "t",
	LISTS_TABLE_NAME: "l",
	COGNITO_USER_POOL_ID: "eu-west-1_pool",
	COGNITO_CLIENT_ID: "client",
};

describe("readConfig", () => {
	it("reads configuration with no CORS origins by default", () => {
		expect(readConfig(base)).toEqual({
			tableName: "t",
			listsTableName: "l",
			userPoolId: "eu-west-1_pool",
			clientId: "client",
			corsOrigins: [],
		});
	});

	it("parses a comma separated origin list", () => {
		expect(
			readConfig({ ...base, CORS_ORIGINS: " https://a.example.com, ,https://b.example.com " })
				.corsOrigins,
		).toEqual(["https://a.example.com", "https://b.example.com"]);
	});

	it("rejects missing configuration", () => {
		for (const key of Object.keys(base)) {
			expect(() => readConfig({ ...base, [key]: undefined })).toThrow("must be set");
		}
	});
});
