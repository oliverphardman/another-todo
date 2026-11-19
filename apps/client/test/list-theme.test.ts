import { describe, expect, it } from "vitest";
import { ColorMath } from "../src/ui/color-math";
import { ListTheme } from "../src/ui/list-theme";

describe("ColorMath", () => {
	it("mixes colors by ratio", () => {
		expect(ColorMath.mix("#000000", "#ffffff", 0)).toBe("#000000");
		expect(ColorMath.mix("#000000", "#ffffff", 1)).toBe("#ffffff");
		expect(ColorMath.mix("#c0392b", "#000000", 0.5)).toBe("#601d16");
		expect(ColorMath.mix("#ff0000", "#0000ff", 0.5)).toBe("#800080");
	});
});

describe("ListTheme", () => {
	it("leaves the default theme alone", () => {
		expect(ListTheme.resolve(null, null, false)).toEqual({ overrides: {}, imageUrl: null });
		expect(ListTheme.resolve({ type: "color", color: "#2564cf" }, null, false)).toEqual({
			overrides: {},
			imageUrl: null,
		});
	});

	it("recolors the background and accents, darker in dark mode", () => {
		const light = ListTheme.resolve({ type: "color", color: "#c0392b" }, null, false);
		expect(light.overrides).toMatchObject({ background: "#c0392b", accent: "#c0392b" });
		expect(light.imageUrl).toBeNull();
		const dark = ListTheme.resolve({ type: "color", color: "#c0392b" }, null, true);
		expect(dark.overrides.background).toBe(ColorMath.mix("#c0392b", "#000000", 0.55));
		expect(dark.overrides.accent).toBe(ColorMath.mix("#c0392b", "#ffffff", 0.35));
		expect(dark.overrides.accentSoft).not.toBe(light.overrides.accentSoft);
	});

	it("uses a photo when its link is known and falls back otherwise", () => {
		expect(
			ListTheme.resolve({ type: "photo", photoId: "p" }, "https://photos.test/p", false),
		).toEqual({ overrides: {}, imageUrl: "https://photos.test/p" });
		expect(ListTheme.resolve({ type: "photo", photoId: "p" }, null, false)).toEqual({
			overrides: {},
			imageUrl: null,
		});
	});
});
