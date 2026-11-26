import { useContext, type ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";

export type Edge = "top" | "right" | "bottom" | "left";

export type Insets = Readonly<Record<Edge, number>>;

const NONE: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export function useInsets(): Insets {
	return useContext(SafeAreaInsetsContext) ?? NONE;
}

export function insetPadding(insets: Insets, extra = 0): ViewStyle {
	return {
		paddingTop: insets.top + extra,
		paddingRight: insets.right + extra,
		paddingBottom: insets.bottom + extra,
		paddingLeft: insets.left + extra,
	};
}

export function ConsumedInsets({
	edges,
	children,
}: {
	edges: readonly Edge[];
	children: ReactNode;
}) {
	const remaining = { ...useInsets() };
	for (const edge of edges) {
		remaining[edge] = 0;
	}
	return (
		<SafeAreaInsetsContext.Provider value={remaining}>{children}</SafeAreaInsetsContext.Provider>
	);
}

export function SafeArea({ children }: { children: ReactNode }) {
	return <View style={[{ flex: 1 }, insetPadding(useInsets())]}>{children}</View>;
}
