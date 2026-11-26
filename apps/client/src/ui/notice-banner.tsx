import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { ConsumedInsets, useInsets } from "./safe-area";
import { StatusBarTone } from "./status-bar-tone";
import { useTheme } from "./theme-context";

export function NoticeBanner({ children }: { children: ReactNode }) {
	const palette = useTheme();
	const { t } = useI18n();
	const { config } = useContainer();
	const [dismissed, setDismissed] = useState(false);
	const insets = useInsets();
	const shown = !dismissed && config.notice !== null;
	const banner = (
		<View
			accessibilityRole="alert"
			style={{
				flexDirection: "row",
				alignItems: "center",
				backgroundColor: palette.warning,
				paddingTop: insets.top + 6,
				paddingBottom: 6,
				paddingLeft: insets.left + 16,
				paddingRight: insets.right + 8,
			}}
		>
			<StatusBarTone foreground={palette.text} />
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
	return (
		<View style={{ flex: 1 }}>
			{shown ? banner : null}
			<ConsumedInsets edges={shown ? ["top"] : []}>
				<View style={{ flex: 1 }}>{children}</View>
			</ConsumedInsets>
		</View>
	);
}
