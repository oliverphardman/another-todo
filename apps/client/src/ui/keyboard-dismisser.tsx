import { useEffect, useRef, type ReactNode } from "react";
import { Keyboard, Platform, TextInput, View, type GestureResponderEvent } from "react-native";

const TAP_SLOP = 10;
const FOCUS_SETTLE_MS = 100;

interface TouchStart {
	readonly x: number;
	readonly y: number;
	readonly focused: unknown;
}

function touchPoint({ nativeEvent }: GestureResponderEvent): { pageX: number; pageY: number } {
	return nativeEvent.changedTouches[0]!;
}

function usesTouchKeyboard(): boolean {
	return Platform.OS === "ios" || Platform.OS === "android";
}

export function KeyboardDismisser({ children }: { children: ReactNode }) {
	const start = useRef<TouchStart | null>(null);
	const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
	useEffect(() => {
		if (!usesTouchKeyboard()) {
			return;
		}
		const subscription = Keyboard.addListener("keyboardDidHide", () =>
			TextInput.State.currentlyFocusedInput()?.blur(),
		);
		return () => {
			subscription.remove();
			clearTimeout(pending.current);
		};
	}, []);
	const began = (event: GestureResponderEvent) => {
		const { pageX, pageY } = touchPoint(event);
		start.current = {
			x: pageX,
			y: pageY,
			focused: TextInput.State.currentlyFocusedInput(),
		};
	};
	const ended = (event: GestureResponderEvent) => {
		const from = start.current;
		start.current = null;
		const { pageX, pageY } = touchPoint(event);
		const target: unknown = event.target;
		if (
			from === null ||
			!from.focused ||
			from.focused === target ||
			Math.hypot(pageX - from.x, pageY - from.y) > TAP_SLOP
		) {
			return;
		}
		pending.current = setTimeout(() => {
			if (TextInput.State.currentlyFocusedInput() === from.focused) {
				Keyboard.dismiss();
			}
		}, FOCUS_SETTLE_MS);
	};
	return (
		<View
			style={{ flex: 1 }}
			{...(usesTouchKeyboard() ? { onTouchStart: began, onTouchEnd: ended } : {})}
		>
			{children}
		</View>
	);
}
