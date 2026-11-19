import { useState } from "react";
import { TextInput, View } from "react-native";
import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface AddTaskBarProps {
	readonly placeholder: string;
	readonly onSubmit: (text: string) => void;
}

export function AddTaskBar({ placeholder, onSubmit }: AddTaskBarProps) {
	const palette = useTheme();
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
				paddingHorizontal: 14,
				minHeight: 52,
				marginBottom: 8,
			}}
		>
			<Icon glyph="plus" size={22} color={palette.accent} />
			<TextInput
				accessibilityLabel={placeholder}
				placeholder={placeholder}
				placeholderTextColor={palette.accent}
				value={text}
				onChangeText={setText}
				onSubmitEditing={submit}
				style={
					{
						flex: 1,
						marginLeft: 12,
						fontFamily: FONT_FAMILY,
						fontSize: 15,
						color: palette.text,
						paddingVertical: 12,
						outlineStyle: "none",
					} as object
				}
			/>
			{text.trim().length === 0 ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Add"
					onPress={submit}
					style={{ paddingHorizontal: 12, paddingVertical: 6 }}
				>
					<AppText weight="600" style={{ color: palette.accent }}>
						Add
					</AppText>
				</PressableSurface>
			)}
		</View>
	);
}
