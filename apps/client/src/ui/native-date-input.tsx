import DateTimePicker from "@react-native-community/datetimepicker";
import { createElement } from "react";
import { Platform } from "react-native";
import { DueDay } from "../domain/due-day";
import { fontStyle } from "./typeface";
import { useIsDark, useTheme } from "./theme-context";

export interface NativeDateInputProps {
	readonly label: string;
	readonly value: string | null;
	readonly fallback: string;
	readonly onChange: (day: string) => void;
}

export function NativeDateInput({ label, value, fallback, onChange }: NativeDateInputProps) {
	const palette = useTheme();
	const dark = useIsDark();
	if (Platform.OS === "web") {
		return createElement("input", {
			type: "date",
			"aria-label": label,
			value: value ?? "",
			onChange: (event: { target: { value: string } }) => {
				if (DueDay.isValid(event.target.value)) {
					onChange(event.target.value);
				}
			},
			style: {
				flex: 1,
				...fontStyle(),
				fontSize: 14,
				color: palette.text,
				backgroundColor: "transparent",
				border: `1px solid ${palette.border}`,
				borderRadius: 4,
				padding: "6px 8px",
				colorScheme: dark ? "dark" : "light",
			},
		});
	}
	return (
		<DateTimePicker
			accessibilityLabel={label}
			mode="date"
			value={DueDay.toLocalDate(value ?? fallback)}
			onChange={(_event, date) => {
				if (date !== undefined) {
					onChange(DueDay.fromDate(date));
				}
			}}
		/>
	);
}
