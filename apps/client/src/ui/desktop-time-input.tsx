import { useState } from "react";
import { TextField } from "./text-field";
import { TimeOfDay } from "../domain/time-of-day";
import type { NativeTimeInputProps } from "./native-time-input";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export function DesktopTimeInput(props: NativeTimeInputProps) {
	return <TimeField key={props.value} {...props} />;
}

function TimeField({ label, value, onChange }: NativeTimeInputProps) {
	const palette = useTheme();
	const [text, setText] = useState(value);
	const commit = () => {
		const time = TimeOfDay.parse(text);
		setText(time ?? value);
		if (time !== null && time !== value) {
			onChange(time);
		}
	};
	return (
		<TextField
			accessibilityLabel={label}
			value={text}
			onChangeText={setText}
			onBlur={commit}
			onSubmitEditing={commit}
			maxLength={5}
			style={{
				width: 80,
				fontFamily: FONT_FAMILY,
				fontSize: 14,
				textAlign: "center",
				color: palette.text,
				borderWidth: 1,
				borderColor: palette.border,
				borderRadius: 4,
				paddingVertical: 6,
				paddingHorizontal: 8,
			}}
		/>
	);
}
