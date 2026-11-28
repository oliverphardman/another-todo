import { useState } from "react";
import { Platform, View } from "react-native";
import type { AddTaskPosition, RowStyle } from "../state/app-settings";
import { TextField } from "./text-field";
import { Icon } from "./icon";
import { rowMetrics } from "./row-metrics";
import { fontStyle } from "./typeface";
import { useAddFieldColors } from "./use-add-field-colors";

export interface AddTaskBarProps {
	readonly rowStyle: RowStyle;
	readonly position: AddTaskPosition;
	readonly placeholder: string;
	readonly onSubmit: (text: string) => void;
}

export function AddTaskBar({ rowStyle, position, placeholder, onSubmit }: AddTaskBarProps) {
	const { addBar: metrics, circle } = rowMetrics(rowStyle);
	const { addField, onAddField } = useAddFieldColors(position);
	const [text, setText] = useState("");
	const [focused, setFocused] = useState(false);
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
				backgroundColor: addField,
				borderRadius: 4,
				paddingHorizontal: metrics.paddingHorizontal,
				minHeight: metrics.height,
				marginBottom: position === "top" ? 8 : 0,
			}}
		>
			<View style={{ width: metrics.iconSize, alignItems: "center" }}>
				{focused || text.length > 0 ? (
					<Icon
						glyph="circle"
						size={circle.size}
						strokeWidth={circle.strokeWidth}
						color={onAddField}
					/>
				) : (
					<Icon glyph="plus" size={metrics.plusSize} color={onAddField} />
				)}
			</View>
			<TextField
				accessibilityLabel={placeholder}
				placeholder={placeholder}
				placeholderTextColor={onAddField}
				cursorColor={onAddField}
				selectionColor={Platform.OS === "ios" ? onAddField : undefined}
				value={text}
				onChangeText={setText}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				onSubmitEditing={submit}
				style={
					{
						flex: 1,
						marginLeft: metrics.gap,
						...fontStyle(),
						fontSize: metrics.fontSize,
						color: onAddField,
						paddingVertical: metrics.textPadding,
						outlineStyle: "none",
					} as object
				}
			/>
		</View>
	);
}
