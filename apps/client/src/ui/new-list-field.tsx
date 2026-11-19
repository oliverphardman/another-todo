import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { Icon } from "./icon";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export const SIDEBAR_ROW_HEIGHT = 44;

export interface NewListFieldProps {
	readonly onSubmit: (name: string) => void;
	readonly onCancel: () => void;
}

export function NewListField({ onSubmit, onCancel }: NewListFieldProps) {
	const palette = useTheme();
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
				minHeight: SIDEBAR_ROW_HEIGHT,
				paddingHorizontal: 10,
			}}
		>
			<Icon glyph="plus" color={palette.accent} />
			<TextInput
				autoFocus
				accessibilityLabel="New list"
				placeholder="New list"
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
						marginLeft: 14,
						padding: 0,
						fontFamily: FONT_FAMILY,
						fontSize: 14,
						color: palette.text,
						outlineStyle: "none",
					} as object
				}
			/>
		</View>
	);
}
