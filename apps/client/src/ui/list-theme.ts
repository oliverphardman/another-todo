import { DEFAULT_THEME_COLOR, type ThemeSetting } from "../domain/view-settings";
import { ColorMath } from "./color-math";
import type { Palette } from "./theme";

export interface ResolvedTheme {
	readonly overrides: Partial<Palette>;
	readonly imageUrl: string | null;
}

export class ListTheme {
	static resolve(
		setting: ThemeSetting | null,
		photoUrl: string | null,
		dark: boolean,
	): ResolvedTheme {
		if (setting?.type === "photo" && photoUrl !== null) {
			return { overrides: {}, imageUrl: photoUrl };
		}
		if (setting?.type === "color" && setting.color !== DEFAULT_THEME_COLOR) {
			return {
				overrides: {
					background: dark ? ColorMath.mix(setting.color, "#000000", 0.55) : setting.color,
					accent: dark ? ColorMath.mix(setting.color, "#ffffff", 0.35) : setting.color,
					accentSoft: ColorMath.mix(
						setting.color,
						dark ? "#000000" : "#ffffff",
						dark ? 0.35 : 0.85,
					),
				},
				imageUrl: null,
			};
		}
		return { overrides: {}, imageUrl: null };
	}
}
