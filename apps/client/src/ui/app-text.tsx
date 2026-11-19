import { Text, type TextProps, type TextStyle } from "react-native";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface AppTextProps extends TextProps {
	readonly size?: number;
	readonly weight?: TextStyle["fontWeight"];
	readonly tone?: "primary" | "secondary" | "onAccent" | "danger";
}

export function AppText({
	size = 14,
	weight = "400",
	tone = "primary",
	style,
	...rest
}: AppTextProps) {
	const palette = useTheme();
	const colors = {
		primary: palette.text,
		secondary: palette.textSecondary,
		onAccent: palette.onAccent,
		danger: palette.danger,
	};
	return (
		<Text
			{...rest}
			style={[
				{
					fontFamily: FONT_FAMILY,
					fontSize: size,
					fontWeight: weight,
					color: colors[tone],
				},
				style,
			]}
		/>
	);
}
