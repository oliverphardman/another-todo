import { Text, type TextProps, type TextStyle } from "react-native";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export interface AppTextProps extends TextProps {
	readonly size?: number;
	readonly weight?: TextStyle["fontWeight"];
	readonly tone?: "primary" | "secondary" | "onAccent" | "title" | "danger";
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
		title: palette.title,
		danger: palette.danger,
	};
	return (
		<Text
			{...rest}
			style={[
				{
					...fontStyle(weight),
					fontSize: size,
					color: colors[tone],
				},
				style,
			]}
		/>
	);
}
