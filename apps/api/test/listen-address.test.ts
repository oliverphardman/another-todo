import { describe, expect, it } from "vitest";
import { parseListenAddress } from "../src/listen-address";

describe("parseListenAddress", () => {
	it("parses host and port", () => {
		expect(parseListenAddress("127.0.0.1:8080")).toEqual({ host: "127.0.0.1", port: 8080 });
	});

	it("defaults to localhost:3000", () => {
		expect(parseListenAddress(undefined)).toEqual({ host: "localhost", port: 3000 });
	});

	it("rejects malformed addresses", () => {
		for (const value of ["", "localhost", ":80", "host:abc", "host:70000", "host:-1", "host:1.5"]) {
			expect(() => parseListenAddress(value)).toThrow("Invalid listen address");
		}
	});
});
