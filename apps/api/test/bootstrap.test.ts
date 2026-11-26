import { describe, expect, it } from "vitest";
import { readConfig } from "../src/bootstrap";

describe("readConfig", () => {
	it("reads the public URL with no CORS origins or notice by default", () => {
		expect(readConfig({ PUBLIC_API_URL: "https://api.example.com" })).toEqual({
			publicUrl: "https://api.example.com",
			corsOrigins: [],
			notice: null,
			maxUploadBytes: 10 * 1024 * 1024,
		});
	});

	it("parses a comma separated origin list and the notice", () => {
		expect(
			readConfig({
				PUBLIC_API_URL: "https://api.example.com",
				CORS_ORIGINS: " https://a.example.com, ,https://b.example.com ",
				SERVER_NOTICE: " Shared demo ",
			}),
		).toMatchObject({
			corsOrigins: ["https://a.example.com", "https://b.example.com"],
			notice: "Shared demo",
		});
	});

	it("takes the upload limit in megabytes", () => {
		expect(readConfig({ MAX_UPLOAD_MB: " 64 " }, "http://localhost:3000").maxUploadBytes).toBe(
			64 * 1024 * 1024,
		);
	});

	it.each(["0", "1025", "2.5", "ten"])("rejects an upload limit of %s", (value) => {
		expect(() => readConfig({ MAX_UPLOAD_MB: value }, "http://localhost:3000")).toThrow(
			"MAX_UPLOAD_MB must be a whole number from 1 to 1024",
		);
	});

	it("falls back to the given URL and rejects a missing one", () => {
		expect(readConfig({}, "http://localhost:3000").publicUrl).toBe("http://localhost:3000");
		expect(() => readConfig({})).toThrow("PUBLIC_API_URL must be set");
	});
});
