import { TextInput, type TextInputProps } from "react-native";

const WITHOUT_FOCUS_RING = { enableFocusRing: false } as object;

export function TextField(props: TextInputProps) {
	return <TextInput {...props} {...WITHOUT_FOCUS_RING} />;
}
