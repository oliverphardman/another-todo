import { useI18n } from "../i18n/i18n-context";
import { View } from "react-native";
import { useContainer } from "./container-context";
import { AppText } from "./app-text";
import { PressableSurface } from "./pressable-surface";
import { useObservable } from "./hooks";
import { useTheme } from "./theme-context";

export function SyncBanner() {
	const { sync, auth } = useContainer();
	const palette = useTheme();
	const { t, count } = useI18n();
	const status = useObservable(sync);
	if (status.rejected > 0) {
		return (
			<View
				accessibilityRole="alert"
				style={{
					flexDirection: "row",
					alignItems: "center",
					backgroundColor: palette.warning,
					padding: 10,
				}}
			>
				<AppText size={13} style={{ flex: 1 }}>
					{count("sync.rejected", status.rejected)}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("sync.dismiss")}
					onPress={() => sync.dismissRejected()}
					style={{ paddingHorizontal: 10, paddingVertical: 4 }}
				>
					<AppText size={13} weight="600" style={{ color: palette.accent }}>
						{t("sync.dismiss")}
					</AppText>
				</PressableSurface>
			</View>
		);
	}
	if (status.phase === "unauthorized") {
		return (
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					backgroundColor: palette.warning,
					padding: 10,
				}}
			>
				<AppText size={13} style={{ flex: 1 }}>
					{t("signIn.expired")}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("signIn.again")}
					onPress={() => void auth.signIn()}
					style={{ paddingHorizontal: 10, paddingVertical: 4 }}
				>
					<AppText size={13} weight="600" style={{ color: palette.accent }}>
						{t("signIn.button")}
					</AppText>
				</PressableSurface>
			</View>
		);
	}
	return null;
}
