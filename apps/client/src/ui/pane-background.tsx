import type { ReactNode } from "react";
import { ImageBackground, View } from "react-native";
import { useTheme } from "./theme-context";

export function PaneBackground({
	imageUrl,
	children,
}: {
	imageUrl: string | null;
	children: ReactNode;
}) {
	const palette = useTheme();
	if (imageUrl === null) {
		return <View style={{ flex: 1, backgroundColor: palette.background }}>{children}</View>;
	}
	return (
		<ImageBackground
			accessibilityLabel="List background photo"
			source={{ uri: imageUrl }}
			resizeMode="cover"
			style={{ flex: 1, backgroundColor: palette.background }}
		>
			<View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.28)" }}>{children}</View>
		</ImageBackground>
	);
}
