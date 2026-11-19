import { describe, expect, it } from "vitest";
import { ErrorHandler } from "../src/http/error-handler";

function run(error: unknown): { status: number; body: unknown } {
	const result = { status: 0, body: undefined as unknown };
	const response = {
		status(code: number) {
			result.status = code;
			return this;
		},
		json(body: unknown) {
			result.body = body;
		},
	};
	new ErrorHandler().middleware()(error, {} as never, response as never, () => undefined);
	return result;
}

describe("ErrorHandler", () => {
	it("passes through client errors that carry a status", () => {
		expect(run({ status: 415, message: "unsupported" })).toEqual({
			status: 415,
			body: { error: "unsupported" },
		});
	});

	it("hides details of everything else", () => {
		for (const error of [
			new Error("secret"),
			{ status: 503, message: "secret" },
			{ status: 200 },
			{ status: "400" },
		]) {
			expect(run(error)).toEqual({ status: 500, body: { error: "Internal server error" } });
		}
	});
});
