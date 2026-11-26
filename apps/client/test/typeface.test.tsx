import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { AppText } from "../src/ui/app-text";
import {
	BUNDLED_FAMILY,
	BUNDLED_SEMIBOLD_FAMILY,
	SYSTEM_FONT_STACK,
	fontStyle,
} from "../src/ui/typeface";

const original = Platform.OS;

afterEach(() => {
	cleanup();
	Platform.OS = original;
});

type FontPlugin = [
	"expo-font",
	{
		android: {
			fonts: { fontFamily: string; fontDefinitions: { path: string; weight: number }[] }[];
		};
		ios: { fonts: string[] };
	},
];

const app = JSON.parse(readFileSync(resolve("app.json"), "utf8")) as {
	expo: { plugins: unknown[] };
};
const [, fonts] = app.expo.plugins.find(
	(plugin): plugin is FontPlugin => Array.isArray(plugin) && plugin[0] === "expo-font",
)!;

function familyName(path: string): string {
	const file = readFileSync(resolve(path));
	const tables = file.readUInt16BE(4);
	for (let table = 0; table < tables; table++) {
		const entry = 12 + table * 16;
		if (file.toString("latin1", entry, entry + 4) !== "name") {
			continue;
		}
		const start = file.readUInt32BE(entry + 8);
		const strings = start + file.readUInt16BE(start + 4);
		for (let record = 0; record < file.readUInt16BE(start + 2); record++) {
			const at = start + 6 + record * 12;
			if (file.readUInt16BE(at) === 3 && file.readUInt16BE(at + 6) === 1) {
				const from = strings + file.readUInt16BE(at + 10);
				return Buffer.from(file.subarray(from, from + file.readUInt16BE(at + 8)))
					.swap16()
					.toString("utf16le");
			}
		}
	}
	return "";
}

describe("fontStyle", () => {
	it("uses the bundled font at every weight on Android", () => {
		for (const weight of ["400", "600", "700"] as const) {
			expect(fontStyle(weight, "android")).toEqual({
				fontFamily: BUNDLED_FAMILY,
				fontWeight: weight,
			});
		}
	});

	it("names the semibold family on iOS, which lists it separately", () => {
		expect(fontStyle("600", "ios").fontFamily).toBe(BUNDLED_SEMIBOLD_FAMILY);
		expect(fontStyle("500", "ios").fontFamily).toBe(BUNDLED_SEMIBOLD_FAMILY);
		expect(fontStyle(undefined, "ios").fontFamily).toBe(BUNDLED_FAMILY);
		expect(fontStyle("700", "ios").fontFamily).toBe(BUNDLED_FAMILY);
	});

	it.each(["web", "macos", "windows"])("keeps the font stack on %s", (platform) => {
		expect(fontStyle("600", platform)).toEqual({
			fontFamily: SYSTEM_FONT_STACK,
			fontWeight: "600",
		});
	});

	it("styles text for the platform it runs on", () => {
		Platform.OS = "android";
		render(<AppText weight="600">Hello</AppText>);
		expect(screen.getByText("Hello").style.fontFamily).toBe(BUNDLED_FAMILY);
	});
});

describe("the bundled font", () => {
	const definitions = fonts.android.fonts[0]!.fontDefinitions;

	it("is registered on Android under the name the app asks for", () => {
		expect(fonts.android.fonts[0]!.fontFamily).toBe(BUNDLED_FAMILY);
		expect(definitions.map((entry) => entry.weight)).toEqual([400, 600, 700]);
	});

	it("ships files whose family names are the ones iOS is asked for", () => {
		expect(fonts.ios.fonts).toEqual(definitions.map((entry) => entry.path));
		expect(fonts.ios.fonts.map(familyName)).toEqual([
			BUNDLED_FAMILY,
			BUNDLED_SEMIBOLD_FAMILY,
			BUNDLED_FAMILY,
		]);
	});

	it("comes with its license", () => {
		expect(readFileSync(resolve("assets/fonts/LICENSE.txt"), "utf8")).toContain(
			"SIL Open Font License",
		);
	});
});
