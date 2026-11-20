import { useState } from "react";
import { Linking, View } from "react-native";
import { DemoHost } from "../config/demo-host";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export function DemoBanner() {
	const palette = useTheme();
	const { t } = useI18n();
	const [dismissed, setDismissed] = useState(false);
	if (dismissed || !DemoHost.isActive()) {
		return null;
	}
	return (
		<View
			accessibilityRole="alert"
			style={{
				flexDirection: "row",
				alignItems: "center",
				backgroundColor: palette.warning,
				paddingVertical: 6,
				paddingLeft: 16,
				paddingRight: 8,
			}}
		>
			<AppText size={13} style={{ flex: 1 }}>
				{t("demo.message")}{" "}
				<AppText
					size={13}
					accessibilityRole="link"
					onPress={() => void Linking.openURL(DemoHost.SOURCE_URL)}
					style={{ color: palette.accent, textDecorationLine: "underline" }}
				>
					{t("demo.source")}
				</AppText>
			</AppText>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("demo.dismiss")}
				onPress={() => setDismissed(true)}
				style={{ padding: 6 }}
			>
				<Icon glyph="close" size={16} color={palette.text} />
			</PressableSurface>
		</View>
	);
}
