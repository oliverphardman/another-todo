import { useI18n } from "../i18n/i18n-context";
import { useState } from "react";
import { View } from "react-native";
import { TextField } from "./text-field";
import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { rowMetrics } from "./row-metrics";
import type { RowStyle } from "../state/app-settings";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export interface AddTaskBarProps {
	readonly rowStyle: RowStyle;
	readonly placeholder: string;
	readonly onSubmit: (text: string) => void;
}

export function AddTaskBar({ rowStyle, placeholder, onSubmit }: AddTaskBarProps) {
	const metrics = rowMetrics(rowStyle).addBar;
	const palette = useTheme();
	const { t } = useI18n();
	const [text, setText] = useState("");
	const submit = () => {
		if (text.trim().length > 0) {
			onSubmit(text);
			setText("");
		}
	};
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				backgroundColor: palette.surface,
				borderRadius: 4,
				paddingHorizontal: metrics.paddingHorizontal,
				minHeight: metrics.height,
				marginBottom: 8,
			}}
		>
			<Icon glyph="plus" size={metrics.iconSize} color={palette.accent} />
			<TextField
				accessibilityLabel={placeholder}
				placeholder={placeholder}
				placeholderTextColor={palette.accent}
				value={text}
				onChangeText={setText}
				onSubmitEditing={submit}
				style={
					{
						flex: 1,
						marginLeft: metrics.gap,
						...fontStyle(),
						fontSize: metrics.fontSize,
						color: palette.text,
						paddingVertical: metrics.textPadding,
						outlineStyle: "none",
					} as object
				}
			/>
			{text.trim().length === 0 ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("task.addButton")}
					onPress={submit}
					style={{ paddingHorizontal: 12, paddingVertical: 6 }}
				>
					<AppText weight="600" style={{ color: palette.accent }}>
						{t("task.addButton")}
					</AppText>
				</PressableSurface>
			)}
		</View>
	);
}
