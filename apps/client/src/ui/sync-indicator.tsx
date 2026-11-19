import { useI18n } from "../i18n/i18n-context";
import { View } from "react-native";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { useTheme } from "./theme-context";

export function SyncIndicator() {
	const { sync, store } = useContainer();
	const palette = useTheme();
	const { t } = useI18n();
	const status = useObservable(sync);
	const { pendingChanges } = useObservable(store);
	if (status.phase !== "offline" || pendingChanges === 0) {
		return null;
	}
	return (
		<View
			accessibilityRole="image"
			accessibilityLabel={t("sync.waiting")}
			style={{
				width: 32,
				height: 32,
				borderRadius: 16,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: palette.surface,
				marginLeft: 8,
			}}
		>
			<Icon glyph="syncOff" size={18} color={palette.danger} />
		</View>
	);
}
