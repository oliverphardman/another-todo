import { useEffect, type ReactNode } from "react";
import { Keyboard, Platform, TextInput, View } from "react-native";

function usesTouchKeyboard(): boolean {
	return Platform.OS === "ios" || Platform.OS === "android";
}

export function KeyboardDismisser({ children }: { children: ReactNode }) {
	useEffect(() => {
		if (!usesTouchKeyboard()) {
			return;
		}
		const subscription = Keyboard.addListener("keyboardDidHide", () =>
			TextInput.State.currentlyFocusedInput()?.blur(),
		);
		return () => subscription.remove();
	}, []);
	return <View style={{ flex: 1 }}>{children}</View>;
}
