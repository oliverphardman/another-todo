import { useI18n } from "../i18n/i18n-context";
import { useRef, useState } from "react";
import { View } from "react-native";
import { TextField } from "./text-field";
import { Icon } from "./icon";
import type { MenuMetrics } from "./menu-metrics";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export const FOOTER_INSET = 6;

export interface NewListFieldProps {
	readonly metrics: MenuMetrics;
	readonly onSubmit: (name: string) => void;
	readonly onCancel: () => void;
}

export function NewListField({ metrics, onSubmit, onCancel }: NewListFieldProps) {
	const palette = useTheme();
	const { t } = useI18n();
	const [name, setName] = useState("");
	const finished = useRef(false);
	const finish = () => {
		if (finished.current) {
			return;
		}
		finished.current = true;
		if (name.trim().length === 0) {
			onCancel();
		} else {
			onSubmit(name);
		}
	};
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				minHeight: metrics.rowHeight,
				paddingHorizontal: metrics.paddingStart - FOOTER_INSET,
			}}
		>
			<Icon
				glyph="plus"
				size={metrics.iconSize}
				strokeWidth={metrics.strokeWidth}
				color={palette.text}
			/>
			<TextField
				autoFocus
				accessibilityLabel={t("sidebar.newList")}
				placeholder={t("sidebar.newList")}
				placeholderTextColor={palette.textSecondary}
				value={name}
				onChangeText={setName}
				onSubmitEditing={finish}
				onBlur={finish}
				onKeyPress={(event) => {
					if (event.nativeEvent.key === "Escape") {
						finished.current = true;
						onCancel();
					}
				}}
				style={
					{
						flex: 1,
						marginLeft: metrics.labelGap,
						padding: 0,
						...fontStyle(),
						fontSize: metrics.fontSize,
						color: palette.text,
						outlineStyle: "none",
					} as object
				}
			/>
		</View>
	);
}
