import { useI18n } from "../i18n/i18n-context";
import type { ReactNode } from "react";
import { Image, Platform, View, useWindowDimensions } from "react-native";
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
	const { width, height } = useWindowDimensions();
	return (
		<View
			style={
				{
					flex: 1,
					overflow: "hidden",
					backgroundColor: palette.background,
					...(Platform.OS === "web" ? { clipPath: "inset(0)" } : {}),
				} as object
			}
		>
			<Image
				accessibilityLabel={t("list.backgroundPhoto")}
				source={{ uri: imageUrl }}
				resizeMode="cover"
				style={
					Platform.OS === "web"
						? ({ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 } as object)
						: { position: "absolute", top: 0, right: 0, width, height }
				}
			/>
			<View style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.28)" }}>{children}</View>
		</View>
	);
}
