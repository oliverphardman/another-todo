import { useState } from "react";
import { View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { CredentialField } from "./credential-field";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export interface SignInScreenProps {
	readonly providers: readonly IdentityProvider[];
}

export function SignInScreen({ providers }: SignInScreenProps) {
	const { auth, config, server } = useContainer();
	const palette = useTheme();
	const { t } = useI18n();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [failed, setFailed] = useState(false);
	const button = {
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 20,
		borderRadius: 4,
		marginTop: 12,
		minWidth: 260,
	} as const;
	const submit = () => {
		setFailed(false);
		auth.signInWithPassword({ username, password }).catch(() => setFailed(true));
	};
	return (
		<View
			style={{
				flex: 1,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: palette.background,
				padding: 24,
			}}
		>
			<Icon glyph="check" size={64} color={palette.onAccent} />
			<AppText role="heading" size={32} weight="600" tone="onAccent" style={{ marginTop: 16 }}>
				{t("app.name")}
			</AppText>
			<AppText tone="onAccent" style={{ marginTop: 8, marginBottom: 24, textAlign: "center" }}>
				{t("app.tagline")}
			</AppText>
			{config.authentication === "password" ? (
				<>
					<CredentialField
						label={t("signIn.username")}
						placeholder={t("signIn.username")}
						value={username}
						onChange={setUsername}
						autoFocus
					/>
					<CredentialField
						label={t("signIn.password")}
						placeholder={t("signIn.password")}
						value={password}
						onChange={setPassword}
						onSubmit={submit}
						secure
					/>
					{failed ? (
						<AppText accessibilityRole="alert" tone="onAccent" style={{ marginTop: 12 }}>
							{t("signIn.invalid")}
						</AppText>
					) : null}
				</>
			) : null}
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("signIn.button")}
				onPress={() => (config.authentication === "password" ? submit() : void auth.signIn())}
				style={{ ...button, backgroundColor: palette.surface }}
			>
				<AppText weight="600" style={{ color: palette.accent }}>
					{t("signIn.button")}
				</AppText>
			</PressableSurface>
			{providers.map((provider) => (
				<PressableSurface
					key={provider}
					accessibilityRole="button"
					accessibilityLabel={t("signIn.provider", { provider })}
					onPress={() => void auth.signIn(provider)}
					style={{ ...button, backgroundColor: palette.surface }}
				>
					<AppText weight="600">{t("signIn.provider", { provider })}</AppText>
				</PressableSurface>
			))}
			{server.enforced ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("server.change")}
					onPress={() => void server.change()}
					style={{ ...button, marginTop: 24 }}
				>
					<AppText tone="onAccent" style={{ textDecorationLine: "underline" }}>
						{t("server.change")}
					</AppText>
				</PressableSurface>
			)}
		</View>
	);
}
