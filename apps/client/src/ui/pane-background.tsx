import { useI18n } from "../i18n/i18n-context";
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
	const { t } = useI18n();
	if (imageUrl === null) {
		return <View style={{ flex: 1, backgroundColor: palette.background }}>{children}</View>;
	}
	return (
		<ImageBackground
			accessibilityLabel={t("list.backgroundPhoto")}
			source={{ uri: imageUrl }}
			resizeMode="cover"
			style={{ flex: 1, backgroundColor: palette.background }}
		>
			<View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.28)" }}>{children}</View>
		</ImageBackground>
	);
}
