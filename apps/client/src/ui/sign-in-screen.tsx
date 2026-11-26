import { useState } from "react";
import type { IdentityProvider } from "../auth/authorization-server";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { BrandButton } from "./brand-button";
import { BrandIntro } from "./brand-intro";
import { CenteredScreen } from "./centered-screen";
import { useContainer } from "./container-context";
import { CredentialField } from "./credential-field";
import { PressableSurface } from "./pressable-surface";

export interface SignInScreenProps {
	readonly providers: readonly IdentityProvider[];
}

export function SignInScreen({ providers }: SignInScreenProps) {
	const { auth, config, server } = useContainer();
	const { t } = useI18n();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [failed, setFailed] = useState(false);
	const withPassword = config.authentication === "password";
	const submit = () => {
		setFailed(false);
		auth.signInWithPassword({ username, password }).catch(() => setFailed(true));
	};
	return (
		<CenteredScreen>
			<BrandIntro animate={false}>
				<AppText tone="onAccent" style={{ marginBottom: 4, textAlign: "center" }}>
					{withPassword ? t("signIn.prompt") : t("app.tagline")}
				</AppText>
				{withPassword ? (
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
				<BrandButton
					label={t("signIn.button")}
					onPress={() => (withPassword ? submit() : void auth.signIn())}
				/>
				{providers.map((provider) => (
					<BrandButton
						key={provider}
						label={t("signIn.provider", { provider })}
						onPress={() => void auth.signIn(provider)}
					/>
				))}
				{server.enforced ? null : (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={t("server.change")}
						onPress={() => void server.change()}
						style={{ alignItems: "center", paddingVertical: 12, marginTop: 24, minWidth: 260 }}
					>
						<AppText tone="onAccent" style={{ textDecorationLine: "underline" }}>
							{t("server.change")}
						</AppText>
					</PressableSurface>
				)}
			</BrandIntro>
		</CenteredScreen>
	);
}
