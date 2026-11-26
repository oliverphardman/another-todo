import type { ReactNode } from "react";
import { ScrollView } from "react-native";
import { KeyboardSafe } from "./keyboard-safe";
import { insetPadding, useInsets } from "./safe-area";
import { StatusBarTone } from "./status-bar-tone";
import { useTheme } from "./theme-context";

const MARGIN = 24;

export function CenteredScreen({ children }: { children: ReactNode }) {
	const palette = useTheme();
	const insets = useInsets();
	return (
		<KeyboardSafe style={{ backgroundColor: palette.background }}>
			<StatusBarTone foreground={palette.onAccent} />
			<ScrollView
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={[
					{ flexGrow: 1, alignItems: "center", justifyContent: "center" },
					insetPadding(insets, MARGIN),
				]}
			>
				{children}
			</ScrollView>
		</KeyboardSafe>
	);
}
