import { useSyncExternalStore, type ReactNode } from "react";
import { View } from "react-native";
import { Profiles } from "../auth/profile";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useTheme } from "./theme-context";

const AVATAR = 40;

export function AccountHeader({ children }: { children?: ReactNode }) {
	const { auth } = useContainer();
	const { t } = useI18n();
	const palette = useTheme();
	const profile = useSyncExternalStore(auth.subscribe, () => auth.profile);
	const name = profile?.name ?? profile?.email ?? t("app.name");
	const email = profile?.name === null ? null : (profile?.email ?? null);
	return (
		<View
			style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8 }}
		>
			{profile === null ? null : (
				<View
					aria-hidden
					style={{
						width: AVATAR,
						height: AVATAR,
						borderRadius: AVATAR / 2,
						marginRight: 10,
						alignItems: "center",
						justifyContent: "center",
						backgroundColor: palette.accent,
					}}
				>
					<AppText weight="600" style={{ color: palette.sidebar }}>
						{Profiles.initials(profile)}
					</AppText>
				</View>
			)}
			<View style={{ flex: 1, minHeight: AVATAR, justifyContent: "center" }}>
				<AppText weight="600" numberOfLines={1}>
					{name}
				</AppText>
				{email === null ? null : (
					<AppText size={12} tone="secondary" numberOfLines={1}>
						{email}
					</AppText>
				)}
			</View>
			{children}
		</View>
	);
}
