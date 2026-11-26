import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, type ViewStyle } from "react-native";

export function useKeyboardShown(): boolean {
	const [shown, setShown] = useState(false);
	useEffect(() => {
		const subscriptions = [
			Keyboard.addListener("keyboardWillShow", () => setShown(true)),
			Keyboard.addListener("keyboardDidShow", () => setShown(true)),
			Keyboard.addListener("keyboardDidHide", () => setShown(false)),
		];
		return () => subscriptions.forEach((subscription) => subscription?.remove());
	}, []);
	return shown;
}

export function KeyboardSafe({ children, style }: { children: ReactNode; style?: ViewStyle }) {
	return (
		<KeyboardAvoidingView
			behavior="padding"
			enabled={useKeyboardShown()}
			style={[{ flex: 1 }, style]}
		>
			{children}
		</KeyboardAvoidingView>
	);
}
