import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const patchedPackages = [
	...read("pnpm-workspace.yaml").matchAll(/^ {2}(\S+)@[^@\s]+: patches\//gm),
].map((match) => match[1]);

const removals = read("../../.github/workflows/apps.yml")
	.split("\n")
	.filter((line) => line.includes("pnpm remove "));

describe("release workflow", () => {
	it("allows unused patches wherever it removes a patched package", () => {
		const affected = removals.filter((line) =>
			line.split(/\s+/).some((word) => patchedPackages.includes(word)),
		);
		expect(affected).toHaveLength(2);
		for (const line of affected) {
			expect(line).toContain("--config.allow-unused-patches=true");
		}
	});
});
