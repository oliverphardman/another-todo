import { useState } from "react";
import { View } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export function NoticeBanner() {
	const palette = useTheme();
	const { t } = useI18n();
	const { config } = useContainer();
	const [dismissed, setDismissed] = useState(false);
	if (dismissed || config.notice === null) {
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
				{config.notice}
			</AppText>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("notice.dismiss")}
				onPress={() => setDismissed(true)}
				style={{ padding: 6 }}
			>
				<Icon glyph="close" size={16} color={palette.text} />
			</PressableSurface>
		</View>
	);
}
