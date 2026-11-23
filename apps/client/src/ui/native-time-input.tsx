import DateTimePicker from "@react-native-community/datetimepicker";
import { createElement } from "react";
import { Platform } from "react-native";
import { FONT_FAMILY } from "./theme";
import { useIsDark, useTheme } from "./theme-context";

export interface NativeTimeInputProps {
	readonly label: string;
	readonly value: string;
	readonly onChange: (time: string) => void;
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function NativeTimeInput({ label, value, onChange }: NativeTimeInputProps) {
	const palette = useTheme();
	const dark = useIsDark();
	if (Platform.OS === "web") {
		return createElement("input", {
			type: "time",
			"aria-label": label,
			value,
			onChange: (event: { target: { value: string } }) => {
				if (TIME_PATTERN.test(event.target.value)) {
					onChange(event.target.value);
				}
			},
			style: {
				fontFamily: FONT_FAMILY,
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
	const [hours, minutes] = value.split(":").map(Number);
	return (
		<DateTimePicker
			accessibilityLabel={label}
			mode="time"
			value={new Date(2000, 0, 1, hours, minutes)}
			onChange={(_event, date) => {
				if (date !== undefined) {
					onChange(
						`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
					);
				}
			}}
		/>
	);
}
