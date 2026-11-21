import { TextInput } from "react-native";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface CredentialFieldProps {
	readonly label: string;
	readonly value: string;
	readonly onChange: (value: string) => void;
	readonly onSubmit?: () => void;
	readonly placeholder: string;
	readonly secure?: boolean;
	readonly autoFocus?: boolean;
	readonly kind?: "default" | "url";
}

export function CredentialField({
	label,
	value,
	onChange,
	onSubmit,
	placeholder,
	secure = false,
	autoFocus = false,
	kind = "default",
}: CredentialFieldProps) {
	const palette = useTheme();
	return (
		<TextInput
			accessibilityLabel={label}
			placeholder={placeholder}
			placeholderTextColor={palette.textSecondary}
			value={value}
			onChangeText={onChange}
			onSubmitEditing={onSubmit}
			secureTextEntry={secure}
			autoFocus={autoFocus}
			autoCapitalize="none"
			autoCorrect={false}
			keyboardType={kind === "url" ? "url" : "default"}
			style={
				{
					minWidth: 260,
					marginTop: 12,
					paddingVertical: 12,
					paddingHorizontal: 12,
					borderRadius: 4,
					backgroundColor: palette.surface,
					fontFamily: FONT_FAMILY,
					fontSize: 14,
					color: palette.text,
					outlineStyle: "none",
				} as object
			}
		/>
	);
}
