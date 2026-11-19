import { View } from "react-native";
import { useContainer } from "./container-context";
import { AppText } from "./app-text";
import { PressableSurface } from "./pressable-surface";
import { useObservable } from "./hooks";
import { useTheme } from "./theme-context";

export function SyncBanner() {
	const { sync, auth } = useContainer();
	const palette = useTheme();
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
					{`${status.rejected} ${status.rejected === 1 ? "change" : "changes"} couldn't be saved and ${status.rejected === 1 ? "was" : "were"} undone.`}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Dismiss"
					onPress={() => sync.dismissRejected()}
					style={{ paddingHorizontal: 10, paddingVertical: 4 }}
				>
					<AppText size={13} weight="600" style={{ color: palette.accent }}>
						Dismiss
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
					Your session has expired. Sign in again to sync your changes.
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Sign in again"
					onPress={() => void auth.signIn()}
					style={{ paddingHorizontal: 10, paddingVertical: 4 }}
				>
					<AppText size={13} weight="600" style={{ color: palette.accent }}>
						Sign in
					</AppText>
				</PressableSurface>
			</View>
		);
	}
	return null;
}
