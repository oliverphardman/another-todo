import { describe, expect, it } from "vitest";
import { readConfig } from "../src/bootstrap";

const base = {
	TABLE_NAME: "t",
	LISTS_TABLE_NAME: "l",
	SETTINGS_TABLE_NAME: "s",
	PHOTOS_TABLE_NAME: "p",
	GROUPS_TABLE_NAME: "g",
	SHARES_TABLE_NAME: "sh",
	PHOTOS_BUCKET: "bucket",
	CONNECTIONS_TABLE_NAME: "c",
	WEBSOCKET_MANAGEMENT_URL: "https://ws.example.com/prod",
	COGNITO_USER_POOL_ID: "eu-west-1_pool",
	COGNITO_CLIENT_ID: "client",
	PUBLIC_API_URL: "https://api.example.com",
};

describe("readConfig", () => {
	it("reads configuration with no CORS origins by default", () => {
		expect(readConfig(base)).toEqual({
			tableName: "t",
			listsTableName: "l",
			settingsTableName: "s",
			photosTableName: "p",
			groupsTableName: "g",
			sharesTableName: "sh",
			photosBucket: "bucket",
			connectionsTableName: "c",
			websocketManagementUrl: "https://ws.example.com/prod",
			userPoolId: "eu-west-1_pool",
			clientId: "client",
			publicUrl: "https://api.example.com",
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
