import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const infrastructure = new URL("../../../infra/main.tf", import.meta.url);

describe("the Web Function's environment", () => {
	it("leaves out blank variables, which Lambda Web Functions refuse", async () => {
		const terraform = await readFile(infrastructure, "utf8");
		const assignments = terraform.match(/^\s*environment_variables\s*=.*$/gm);
		expect(assignments?.map((line) => line.trim().replace(/\s+/g, " "))).toEqual([
			'environment_variables = { for name, value in local.api_environment : name => value if value != "" }',
		]);
	});
});
