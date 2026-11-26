import { useI18n } from "../i18n/i18n-context";
import type { ReactNode } from "react";
import { Platform, Pressable, View, type AccessibilityRole, type ViewStyle } from "react-native";
import { AppText } from "./app-text";
import { Icon, type IconGlyph } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export function MenuOverlay({
	onDismiss,
	children,
}: {
	onDismiss: () => void;
	children: ReactNode;
}) {
	const { t } = useI18n();
	return (
		<View
			style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }}
			accessibilityLabel={t("menu.overlay")}
		>
			<Pressable
				accessibilityLabel={t("menu.close")}
				onPress={onDismiss}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
			/>
			{children}
		</View>
	);
}

export function MenuPanel({
	label,
	placement,
	children,
}: {
	label: string;
	placement: ViewStyle;
	children: ReactNode;
}) {
	const palette = useTheme();
	return (
		<View
			accessibilityRole="menu"
			accessibilityLabel={label}
			style={
				{
					position: "absolute",
					backgroundColor: palette.surface,
					borderRadius: 8,
					padding: 4,
					boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.24)",
					...placement,
				} as object
			}
		>
			{children}
		</View>
	);
}

export interface MenuItemProps {
	readonly glyph: IconGlyph;
	readonly label: string;
	readonly onPress: () => void;
	readonly trailing?: "chevron";
	readonly selected?: boolean;
	readonly danger?: boolean;
	readonly disabled?: boolean;
}

export function menuItemRole(radio: boolean): AccessibilityRole {
	if (!radio) {
		return "menuitem";
	}
	return Platform.OS === "web" ? ("menuitemradio" as AccessibilityRole) : "radio";
}

export function MenuItem({
	glyph,
	label,
	onPress,
	trailing,
	selected,
	danger = false,
	disabled = false,
}: MenuItemProps) {
	const palette = useTheme();
	const color = danger ? palette.danger : disabled ? palette.textSecondary : palette.text;
	return (
		<PressableSurface
			accessibilityRole={menuItemRole(selected !== undefined)}
			accessibilityLabel={label}
			aria-checked={selected}
			disabled={disabled}
			onPress={onPress}
			hoverColor={palette.surfaceHover}
			style={{
				flexDirection: "row",
				alignItems: "center",
				minHeight: 40,
				paddingHorizontal: 12,
				borderRadius: 6,
			}}
		>
			<Icon glyph={glyph} size={18} color={color} strokeWidth={1.4} />
			<AppText size={14} style={{ marginLeft: 12, flex: 1, color }}>
				{label}
			</AppText>
			{trailing === "chevron" ? (
				<Icon glyph="chevronRight" size={16} color={palette.textSecondary} />
			) : null}
			{selected === true ? <Icon glyph="check" size={16} color={palette.accent} /> : null}
		</PressableSurface>
	);
}

export function MenuDivider() {
	const palette = useTheme();
	return (
		<View
			{...({ role: "separator" } as object)}
			style={{ height: 1, backgroundColor: palette.border, marginVertical: 4, marginHorizontal: 8 }}
		/>
	);
}
