import type { ImageSourcePropType } from "react-native";
import type { ThemeSetting } from "../domain/view-settings";
import { ColorMath } from "./color-math";
import { DARK, LIGHT, type Palette } from "./theme";

export interface ResolvedTheme {
	readonly overrides: Partial<Palette>;
	readonly image: ImageSourcePropType | null;
}

export type Tone = "light" | "dark";

export type FieldColors = Pick<Palette, "addField" | "onAddField">;

const MINIMUM_CONTRAST = 4.5;

const PHOTO_FIELDS: Readonly<Record<Tone, FieldColors>> = {
	light: { addField: LIGHT.surface, onAddField: LIGHT.text },
	dark: { addField: DARK.surface, onAddField: DARK.text },
};

export class ListTheme {
	static photoField(tone: Tone): FieldColors {
		return PHOTO_FIELDS[tone];
	}

	static resolve(
		setting: ThemeSetting | null,
		image: ImageSourcePropType | null,
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
		if (image !== null) {
			return {
				overrides: {
					accent,
					accentSoft,
					onAccent: "#ffffff",
					title: "#ffffff",
					...ListTheme.photoField(dark ? "dark" : "light"),
				},
				image,
			};
		}
		const field = { addField: (dark ? DARK : LIGHT).surface, onAddField: accent };
		if (dark) {
			return { overrides: { accent, accentSoft, title: accent, ...field }, image: null };
		}
		const onAccent = ColorMath.readableOn(color);
		return {
			overrides: { background: color, onAccent, title: onAccent, accent, accentSoft, ...field },
			image: null,
		};
	}
}
