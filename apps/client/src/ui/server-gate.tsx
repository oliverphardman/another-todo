import { useState, type ReactNode } from "react";
import { View } from "react-native";
import type { AppConfig } from "../config/app-config";
import type { ServerSession } from "../config/server-session";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { CredentialField } from "./credential-field";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export interface ServerGateProps {
	readonly session: ServerSession;
	readonly children: (config: AppConfig) => ReactNode;
}

function Frame({ children }: { children: ReactNode }) {
	const palette = useTheme();
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
			{children}
		</View>
	);
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
	const palette = useTheme();
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={{
				alignItems: "center",
				paddingVertical: 12,
				paddingHorizontal: 20,
				borderRadius: 4,
				marginTop: 12,
				minWidth: 260,
				backgroundColor: palette.surface,
			}}
		>
			<AppText weight="600" style={{ color: palette.accent }}>
				{label}
			</AppText>
		</PressableSurface>
	);
}

function UrlPrompt({ session, invalid }: { session: ServerSession; invalid: boolean }) {
	const { t } = useI18n();
	const palette = useTheme();
	const [address, setAddress] = useState("");
	return (
		<Frame>
			<Icon glyph="check" size={64} color={palette.onAccent} />
			<AppText role="heading" size={24} weight="600" tone="onAccent" style={{ marginTop: 16 }}>
				{t("server.title")}
			</AppText>
			<AppText tone="onAccent" style={{ marginTop: 8, marginBottom: 12, textAlign: "center" }}>
				{t("server.body")}
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
			<Action label={t("server.connect")} onPress={() => void session.connect(address)} />
		</Frame>
	);
}

export function ServerGate({ session, children }: ServerGateProps) {
	const state = useObservable(session);
	const { t } = useI18n();
	switch (state.status) {
		case "resolving":
			return (
				<Frame>
					<AppText tone="onAccent">{t("app.loading")}</AppText>
				</Frame>
			);
		case "needsUrl":
			return <UrlPrompt session={session} invalid={state.invalid} />;
		case "unreachable":
			return (
				<Frame>
					<AppText accessibilityRole="alert" tone="onAccent" style={{ textAlign: "center" }}>
						{t("server.unreachable", { url: state.url })}
					</AppText>
					<Action label={t("server.retry")} onPress={() => void session.retry()} />
					{session.enforced ? null : (
						<Action label={t("server.change")} onPress={() => void session.change()} />
					)}
				</Frame>
			);
		case "ready":
			return <>{children(state.config)}</>;
	}
}
