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

describe("readPort", () => {
	it("defaults to 3000 and validates the value", async () => {
		const { readPort } = await import("../src/listen-address");
		expect(readPort(undefined)).toBe(3000);
		expect(readPort(" ")).toBe(3000);
		expect(readPort("8080")).toBe(8080);
		expect(() => readPort("abc")).toThrow("Invalid PORT: abc");
		expect(() => readPort("70000")).toThrow("Invalid PORT");
	});
});
