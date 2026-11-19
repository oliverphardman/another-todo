import { useState } from "react";
import { TextInput, View } from "react-native";
import { DueDay } from "../domain/due-day";
import { AppText } from "./app-text";
import { PressableSurface } from "./pressable-surface";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface DueDatePickerProps {
	readonly day: string | null;
	readonly today: string;
	readonly onChange: (day: string | null) => void;
}

export function DueDatePicker({ day, today, onChange }: DueDatePickerProps) {
	const palette = useTheme();
	const [custom, setCustom] = useState("");
	const options = [
		{ label: "Today", day: today },
		{ label: "Tomorrow", day: DueDay.add(today, 1) },
		{ label: "Next week", day: DueDay.nextWeek(today) },
	];
	const valid = DueDay.isValid(custom);
	return (
		<View accessibilityLabel="Due date options">
			{options.map((option) => (
				<PressableSurface
					key={option.label}
					accessibilityRole="button"
					accessibilityLabel={`Due ${option.label}`}
					onPress={() => onChange(option.day)}
					hoverColor={palette.surfaceHover}
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						padding: 12,
					}}
				>
					<AppText>{option.label}</AppText>
					<AppText tone="secondary">
						{DueDay.label(option.day, "0000-00-00").replace(/, \d{4}$/, "")}
					</AppText>
				</PressableSurface>
			))}
			<View style={{ flexDirection: "row", alignItems: "center", padding: 12 }}>
				<TextInput
					accessibilityLabel="Custom due date"
					placeholder="YYYY-MM-DD"
					placeholderTextColor={palette.textSecondary}
					value={custom}
					onChangeText={setCustom}
					style={
						{
							flex: 1,
							fontFamily: FONT_FAMILY,
							fontSize: 14,
							color: palette.text,
							borderWidth: 1,
							borderColor: palette.border,
							borderRadius: 4,
							paddingHorizontal: 8,
							paddingVertical: 6,
							outlineStyle: "none",
						} as object
					}
				/>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Set custom due date"
					accessibilityState={{ disabled: !valid }}
					disabled={!valid}
					onPress={() => {
						onChange(custom);
						setCustom("");
					}}
					style={{ paddingHorizontal: 12, paddingVertical: 6 }}
				>
					<AppText weight="600" style={{ color: valid ? palette.accent : palette.textSecondary }}>
						Set
					</AppText>
				</PressableSurface>
			</View>
			{day === null ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Remove due date"
					onPress={() => onChange(null)}
					hoverColor={palette.surfaceHover}
					style={{ padding: 12 }}
				>
					<AppText tone="danger">Remove due date</AppText>
				</PressableSurface>
			)}
		</View>
	);
}
