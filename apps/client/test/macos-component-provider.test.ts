import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface ComponentLibrary {
	readonly libraryPath: string;
	readonly config: {
		readonly name: string;
		readonly type: string;
		readonly ios: { readonly componentProvider: Readonly<Record<string, string>> };
	};
}

interface ComponentGenerator {
	generateRCTThirdPartyComponents(libraries: readonly ComponentLibrary[], outputDir: string): void;
}

const { generateRCTThirdPartyComponents } = createRequire(import.meta.url)(
	"react-native-macos/scripts/codegen/generate-artifacts-executor/generateRCTThirdPartyComponents.js",
) as ComponentGenerator;

describe("macOS third party component provider", () => {
	let directory = "";

	beforeEach(() => {
		directory = mkdtempSync(join(tmpdir(), "atd-codegen-"));
		writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "date-library" }));
	});

	afterEach(() => {
		rmSync(directory, { recursive: true, force: true });
	});

	it("registers classes in a way that tolerates ones missing from the build", () => {
		generateRCTThirdPartyComponents(
			[
				{
					libraryPath: directory,
					config: {
						name: "DateSpec",
						type: "all",
						ios: { componentProvider: { RNDateTimePicker: "MissingComponentView" } },
					},
				},
			],
			directory,
		);

		const source = readFileSync(join(directory, "RCTThirdPartyComponentsProvider.mm"), "utf8");

		expect(source).toContain(
			'thirdPartyComponents[@"RNDateTimePicker"] = NSClassFromString(@"MissingComponentView");',
		);
		expect(source).toContain("thirdPartyComponents = [NSMutableDictionary new];");
		expect(source).not.toContain("@{");
	});
});
