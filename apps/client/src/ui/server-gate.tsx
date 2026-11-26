import { useState, type ReactNode } from "react";
import type { AppConfig } from "../config/app-config";
import type { ServerSession } from "../config/server-session";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { BrandButton } from "./brand-button";
import { BrandIntro } from "./brand-intro";
import { CenteredScreen } from "./centered-screen";
import { CredentialField } from "./credential-field";
import { useObservable } from "./hooks";

export interface ServerGateProps {
	readonly session: ServerSession;
	readonly children: (config: AppConfig) => ReactNode;
}

function UrlPrompt({ session, invalid }: { session: ServerSession; invalid: boolean }) {
	const { t } = useI18n();
	const [address, setAddress] = useState("");
	return (
		<CenteredScreen>
			<BrandIntro>
				<AppText tone="onAccent" style={{ marginBottom: 4, textAlign: "center" }}>
					{t("server.prompt")}
				</AppText>
				<CredentialField
					label={t("server.label")}
					placeholder={t("server.placeholder")}
					value={address}
					onChange={setAddress}
					onSubmit={() => void session.connect(address)}
					kind="url"
					autoFocus
				/>
				{invalid ? (
					<AppText accessibilityRole="alert" tone="onAccent" style={{ marginTop: 12 }}>
						{t("server.invalid")}
					</AppText>
				) : null}
				<BrandButton label={t("server.connect")} onPress={() => void session.connect(address)} />
			</BrandIntro>
		</CenteredScreen>
	);
}

export function ServerGate({ session, children }: ServerGateProps) {
	const state = useObservable(session);
	const { t } = useI18n();
	switch (state.status) {
		case "resolving":
			return (
				<CenteredScreen>
					<AppText tone="onAccent">{t("app.loading")}</AppText>
				</CenteredScreen>
			);
		case "needsUrl":
			return <UrlPrompt session={session} invalid={state.invalid} />;
		case "unreachable":
			return (
				<CenteredScreen>
					<AppText accessibilityRole="alert" tone="onAccent" style={{ textAlign: "center" }}>
						{t("server.unreachable", { url: state.url })}
					</AppText>
					<BrandButton label={t("server.retry")} onPress={() => void session.retry()} />
					{session.enforced ? null : (
						<BrandButton label={t("server.change")} onPress={() => void session.change()} />
					)}
				</CenteredScreen>
			);
		case "ready":
			return <>{children(state.config)}</>;
	}
}
