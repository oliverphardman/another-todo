import { describe, expect, it } from "vitest";
import { LIST_THEME_COLOR } from "../src/domain/view-settings";
import { ColorMath } from "../src/ui/color-math";
import { ListTheme } from "../src/ui/list-theme";
import { DARK, LIGHT } from "../src/ui/theme";

describe("ColorMath", () => {
	it("mixes colors by ratio", () => {
		expect(ColorMath.mix("#000000", "#ffffff", 0)).toBe("#000000");
		expect(ColorMath.mix("#000000", "#ffffff", 1)).toBe("#ffffff");
		expect(ColorMath.mix("#c0392b", "#000000", 0.5)).toBe("#601d16");
		expect(ColorMath.mix("#ff0000", "#0000ff", 0.5)).toBe("#800080");
	});

	it("measures luminance and contrast", () => {
		expect(ColorMath.luminance("#000000")).toBe(0);
		expect(ColorMath.luminance("#ffffff")).toBeCloseTo(1, 5);
		expect(ColorMath.luminance("#808080")).toBeCloseTo(0.2159, 3);
		expect(ColorMath.luminance("#020202")).toBeLessThan(0.001);
		expect(ColorMath.contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
		expect(ColorMath.contrast("#ffffff", "#000000")).toBeCloseTo(21, 1);
		expect(ColorMath.contrast("#777777", "#777777")).toBe(1);
	});

	it("picks readable text for a background", () => {
		expect(ColorMath.readableOn("#2564cf")).toBe("#ffffff");
		expect(ColorMath.readableOn("#f9e7de")).toBe("#1b1a19");
		expect(ColorMath.readableOn("#d5f1ee")).toBe("#1b1a19");
	});

	it("darkens or lightens a color only as far as needed", () => {
		expect(ColorMath.ensureContrast("#2564cf", "#ffffff", 4.5, "#000000")).toBe("#2564cf");
		const darkened = ColorMath.ensureContrast("#f9e7de", "#ffffff", 4.5, "#000000");
		expect(darkened).not.toBe("#f9e7de");
		expect(ColorMath.contrast(darkened, "#ffffff")).toBeGreaterThanOrEqual(4.5);
		const lightened = ColorMath.ensureContrast("#202020", "#292929", 4.5, "#ffffff");
		expect(ColorMath.contrast(lightened, "#292929")).toBeGreaterThanOrEqual(4.5);
		expect(ColorMath.ensureContrast("#777777", "#777777", 21, "#777777")).toBe("#777777");
	});
});

describe("ListTheme", () => {
	it("uses the view's default color in light mode, with readable text and accents", () => {
		const periwinkle = ListTheme.resolve(null, null, false, LIST_THEME_COLOR);
		expect(periwinkle.overrides.background).toBe("#6074c3");
		expect(periwinkle.overrides.onAccent).toBe("#ffffff");
		expect(ColorMath.contrast(periwinkle.overrides.accent!, "#ffffff")).toBeGreaterThanOrEqual(4.5);
		expect(periwinkle.image).toBeNull();
		const peach = ListTheme.resolve(null, null, false, "#f9e7de");
		expect(peach.overrides.background).toBe("#f9e7de");
		expect(peach.overrides.onAccent).toBe("#1b1a19");
		expect(ColorMath.contrast(peach.overrides.accent!, "#ffffff")).toBeGreaterThanOrEqual(4.5);
	});

	it("prefers the user's chosen color over the default", () => {
		const red = ListTheme.resolve(
			{ type: "color", color: "#c0392b" },
			null,
			false,
			LIST_THEME_COLOR,
		);
		expect(red.overrides.background).toBe("#c0392b");
	});

	it("keeps the background #1E1E1E in dark mode while still tinting accents", () => {
		const dark = ListTheme.resolve(
			{ type: "color", color: "#c0392b" },
			null,
			true,
			LIST_THEME_COLOR,
		);
		expect(dark.overrides.background).toBeUndefined();
		expect(dark.overrides.onAccent).toBeUndefined();
		expect(dark.overrides.title).toBe(dark.overrides.accent);
		expect(ColorMath.contrast(dark.overrides.title!, DARK.background)).toBeGreaterThanOrEqual(4.5);
		expect(ColorMath.contrast(dark.overrides.accent!, DARK.surface)).toBeGreaterThanOrEqual(4.5);
		expect(DARK.background).toBe("#1e1e1e");
		expect(DARK.sidebar).toBe("#252525");
		expect(dark.image).toBeNull();
	});

	it("always shows a photo, in light and dark mode, with white text", () => {
		for (const mode of [false, true]) {
			const themed = ListTheme.resolve(
				{ type: "photo", photoId: "p" },
				{ uri: "https://photos.test/p" },
				mode,
				LIST_THEME_COLOR,
			);
			expect(themed.image).toEqual({ uri: "https://photos.test/p" });
			expect(themed.overrides.background).toBeUndefined();
			expect(themed.overrides.onAccent).toBe("#ffffff");
		}
	});

	it.each([
		["light", false, LIGHT],
		["dark", true, DARK],
	] as const)(
		"keeps the add field on the standard %s surface with text in the theme color",
		(_, dark, palette) => {
			for (const color of [LIST_THEME_COLOR, "#c0392b", "#f9e7de"]) {
				const { overrides } = ListTheme.resolve({ type: "color", color }, null, dark, color);
				expect(overrides.addField).toBe(palette.surface);
				expect(overrides.onAddField).toBe(overrides.accent);
				expect(ColorMath.contrast(overrides.onAddField!, palette.surface)).toBeGreaterThanOrEqual(
					4.5,
				);
			}
		},
	);

	it("starts a photo's add field with the system's default look", () => {
		const setting = { type: "photo", photoId: "p" } as const;
		for (const [dark, tone] of [
			[false, "light"],
			[true, "dark"],
		] as const) {
			const themed = ListTheme.resolve(
				setting,
				{ uri: "https://photos.test/p" },
				dark,
				LIST_THEME_COLOR,
			);
			expect(themed.overrides).toMatchObject(ListTheme.photoField(tone));
		}
		expect(ListTheme.photoField("light")).toEqual({
			addField: LIGHT.surface,
			onAddField: LIGHT.text,
		});
		expect(ListTheme.photoField("dark")).toEqual({
			addField: DARK.surface,
			onAddField: DARK.text,
		});
	});

	it("measures how bright a color looks", () => {
		expect(ColorMath.brightness("#000000")).toBe(0);
		expect(ColorMath.brightness("#ffffff")).toBeCloseTo(1, 5);
		expect(ColorMath.brightness("#00ff00")).toBeGreaterThan(ColorMath.brightness("#0000ff"));
	});

	it("falls back to the color when the photo's link is not known", () => {
		const fallback = ListTheme.resolve({ type: "photo", photoId: "p" }, null, false, "#f9e7de");
		expect(fallback.image).toBeNull();
		expect(fallback.overrides.background).toBe("#f9e7de");
	});
});
