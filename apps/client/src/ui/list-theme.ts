import type { ThemeSetting } from "../domain/view-settings";
import { ColorMath } from "./color-math";
import { DARK, type Palette } from "./theme";

export interface ResolvedTheme {
	readonly overrides: Partial<Palette>;
	readonly imageUrl: string | null;
}

const MINIMUM_CONTRAST = 4.5;

export class ListTheme {
	static resolve(
		setting: ThemeSetting | null,
		photoUrl: string | null,
		dark: boolean,
		defaultColor: string,
	): ResolvedTheme {
		const color = setting?.type === "color" ? setting.color : defaultColor;
		const accent = dark
			? ColorMath.ensureContrast(
					ColorMath.mix(color, "#ffffff", 0.35),
					DARK.surface,
					MINIMUM_CONTRAST,
					"#ffffff",
				)
			: ColorMath.ensureContrast(color, "#ffffff", MINIMUM_CONTRAST, "#000000");
		const accentSoft = ColorMath.mix(accent, dark ? "#000000" : "#ffffff", dark ? 0.65 : 0.85);
		if (setting?.type === "photo" && photoUrl !== null) {
			return {
				overrides: { accent, accentSoft, onAccent: "#ffffff", title: "#ffffff" },
				imageUrl: photoUrl,
			};
		}
		if (dark) {
			return { overrides: { accent, accentSoft, title: accent }, imageUrl: null };
		}
		const onAccent = ColorMath.readableOn(color);
		return {
			overrides: { background: color, onAccent, title: onAccent, accent, accentSoft },
			imageUrl: null,
		};
	}
}
