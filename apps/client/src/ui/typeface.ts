import { Platform, type TextStyle } from "react-native";

export const SYSTEM_FONT_STACK =
	'"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

export const BUNDLED_FAMILY = "Selawik";
export const BUNDLED_SEMIBOLD_FAMILY = "Selawik Semibold";

type Weight = NonNullable<TextStyle["fontWeight"]>;

const SEMIBOLD: readonly Weight[] = ["500", "600"];

const FAMILIES: Readonly<Record<string, (weight: Weight) => string>> = {
	android: () => BUNDLED_FAMILY,
	ios: (weight) => (SEMIBOLD.includes(weight) ? BUNDLED_SEMIBOLD_FAMILY : BUNDLED_FAMILY),
};

export function fontStyle(
	weight: Weight = "400",
	platform: string = Platform.OS,
): { readonly fontFamily: string; readonly fontWeight: Weight } {
	return {
		fontFamily: FAMILIES[platform]?.(weight) ?? SYSTEM_FONT_STACK,
		fontWeight: weight,
	};
}
