import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "./app-text";
import { Icon, type IconGlyph } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export const DETAIL_ROW_HEIGHT = 46;

export function DetailCard({ children }: { children: ReactNode }) {
	const palette = useTheme();
	return (
		<View
			style={
				{
					backgroundColor: palette.surface,
					borderRadius: 4,
					marginBottom: 8,
					overflow: "hidden",
					boxShadow: "0px 1px 2px rgba(0, 0, 0, 0.06)",
				} as object
			}
		>
			{children}
		</View>
	);
}

export function DetailSeparator() {
	const palette = useTheme();
	return <View style={{ height: 1, backgroundColor: palette.border }} />;
}

export interface ActionRowProps {
	readonly glyph: IconGlyph;
	readonly label: string;
	readonly active?: boolean;
	readonly danger?: boolean;
	readonly onPress?: () => void;
}

export function ActionRow({
	glyph,
	label,
	active = false,
	danger = false,
	onPress,
}: ActionRowProps) {
	const palette = useTheme();
	const color = danger ? palette.danger : active ? palette.accent : palette.textSecondary;
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={label}
			accessibilityState={{ selected: active, disabled: onPress === undefined }}
			disabled={onPress === undefined}
			onPress={onPress}
			hoverColor={palette.surfaceHover}
			style={{
				flexDirection: "row",
				alignItems: "center",
				minHeight: DETAIL_ROW_HEIGHT,
				paddingHorizontal: 14,
			}}
		>
			<Icon glyph={glyph} size={20} color={color} strokeWidth={1.3} />
			<AppText size={14} style={{ marginLeft: 14, color }}>
				{label}
			</AppText>
		</PressableSurface>
	);
}
