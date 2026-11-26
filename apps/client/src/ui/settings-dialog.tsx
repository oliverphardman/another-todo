import { useMemo, useRef } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { DialogKeys } from "./dialog-keys";
import { useLayoutMode } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { insetPadding, useInsets } from "./safe-area";
import {
	AccountSection,
	AppearanceSection,
	ListsSection,
	MicrosoftSection,
	MyDaySection,
	ServerSection,
} from "./settings-sections";
import { useTheme } from "./theme-context";
import { useBackHandler } from "./use-back-handler";

const WIDTH = 520;
const MARGIN = 80;
const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

export function SettingsDialog({ onClose }: { onClose: () => void }) {
	const { t } = useI18n();
	const palette = useTheme();
	const compact = useLayoutMode() === "compact";
	const { height } = useWindowDimensions();
	const insets = useInsets();
	const close = useRef(onClose);
	close.current = onClose;
	const keys = useMemo(() => ({ accept: () => undefined, dismiss: () => close.current() }), []);
	useBackHandler(() => {
		onClose();
		return true;
	});
	const panel = (
		<View
			accessibilityLabel={t("settings.title")}
			role="dialog"
			style={[
				{ backgroundColor: palette.surface },
				compact
					? { flex: 1, alignSelf: "stretch", ...insetPadding(insets) }
					: {
							width: WIDTH,
							maxWidth: "100%",
							height: height - MARGIN,
							borderRadius: 8,
							borderWidth: 1,
							borderColor: palette.border,
						},
			]}
		>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingLeft: 24,
					paddingRight: 12,
					paddingVertical: 12,
					borderBottomWidth: 1,
					borderBottomColor: palette.border,
				}}
			>
				<AppText role="heading" size={20} weight="600" style={{ flex: 1 }}>
					{t("settings.title")}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("settings.close")}
					onPress={onClose}
					hoverColor={palette.surfaceHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="close" size={18} color={palette.text} />
				</PressableSurface>
			</View>
			<ScrollView
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
			>
				<AppearanceSection />
				<MicrosoftSection />
				<ServerSection />
				<ListsSection />
				<MyDaySection />
				<AccountSection />
			</ScrollView>
		</View>
	);
	return (
		<View
			style={{
				...FILL,
				zIndex: 40,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(0, 0, 0, 0.45)",
			}}
		>
			{compact ? (
				panel
			) : (
				<>
					<Pressable accessibilityLabel={t("dialog.dismiss")} onPress={onClose} style={FILL} />
					<DialogKeys onAccept={keys.accept} onDismiss={keys.dismiss}>
						{panel}
					</DialogKeys>
				</>
			)}
		</View>
	);
}
