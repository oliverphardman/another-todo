import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ThemeSetting } from "../src/domain/view-settings";
import { EN_US } from "../src/i18n/en-us";
import type { PhotoLibrary } from "../src/photos/photo-library";
import { PRESET_PHOTOS } from "../src/photos/preset-photos";
import { ThemeImage } from "../src/photos/theme-image";

const KILOBYTE = 1024;
const folder = resolve(process.cwd(), "assets/themes");
const credits = readFileSync(resolve(process.cwd(), "../../docs/theme-images.md"), "utf8");

const library = {
	urlFor: (id: string) => (id === "mine" ? "https://photos.test/mine" : null),
} as PhotoLibrary;

describe("the included photos", () => {
	it("have ids the server accepts, each used once, with a name", () => {
		const ids = PRESET_PHOTOS.map((preset) => preset.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const preset of PRESET_PHOTOS) {
			expect(preset.id).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
			expect(EN_US[preset.nameKey]).toBeTruthy();
		}
	});

	it("ship an image and a thumbnail for each, and nothing unused", () => {
		const expected = PRESET_PHOTOS.flatMap(({ id }) => [`${id}.jpg`, `${id}-thumbnail.jpg`]);
		expect(readdirSync(folder).sort()).toEqual(expected.sort());
		for (const preset of PRESET_PHOTOS) {
			expect(String(preset.image)).toContain(`${preset.id}.jpg`);
			expect(String(preset.thumbnail)).toContain(`${preset.id}-thumbnail.jpg`);
		}
	});

	it("are JPEGs small enough to bundle with the apps", () => {
		let total = 0;
		for (const name of readdirSync(folder)) {
			const path = resolve(folder, name);
			const size = statSync(path).size;
			total += size;
			expect([...readFileSync(path).subarray(0, 3)], name).toEqual([0xff, 0xd8, 0xff]);
			expect(size, name).toBeLessThan((name.includes("thumbnail") ? 32 : 800) * KILOBYTE);
		}
		expect(total).toBeLessThan(4 * KILOBYTE * KILOBYTE);
	});

	it("are all credited with their source and license", () => {
		for (const { id } of PRESET_PHOTOS) {
			expect(credits).toMatch(
				new RegExp(
					`\\| ${id}\\.jpg +\\|.*https://commons\\.wikimedia\\.org/wiki/File:.*\\| CC0 1\\.0 +\\|`,
				),
			);
		}
	});
});

describe("ThemeImage", () => {
	it("finds the picture behind a photo theme", () => {
		expect(ThemeImage.of({ type: "photo", photoId: "mine" }, library)).toEqual({
			uri: "https://photos.test/mine",
		});
		expect(ThemeImage.of({ type: "preset", presetId: "aurora" }, library)).toBe(
			PRESET_PHOTOS[0]!.image,
		);
	});

	it.each<ThemeSetting | null>([
		null,
		{ type: "color", color: "#2564cf" },
		{ type: "photo", photoId: "gone" },
		{ type: "preset", presetId: "unknown" },
	])("has no picture for %o", (theme) => {
		expect(ThemeImage.of(theme, library)).toBeNull();
	});
});
