import { useEffect, useState } from "react";
import type { MessageKey } from "../i18n/en-us";
import type { MicrosoftEligibility } from "../microsoft/microsoft-sync-service";
import { AppSettings } from "../state/app-settings";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { sidebarMetrics } from "./sidebar-metrics";
import { useLogOut } from "./use-log-out";
import { useI18n } from "../i18n/i18n-context";

export type SyncDirectionKey = "receive" | "send";

export interface MicrosoftSettingsState {
	readonly note: MessageKey | null;
	readonly enabled: boolean;
	readonly receive: boolean;
	readonly send: boolean;
	readonly intervalMinutes: number;
	readonly setDirection: (key: SyncDirectionKey, on: boolean) => void;
	readonly setInterval: (minutes: number) => void;
}

const MICROSOFT_NOTES: Readonly<Record<MicrosoftEligibility, MessageKey | null>> = {
	eligible: null,
	signInRequired: "settings.msSignIn",
	unsupported: "settings.msUnsupported",
};

export function useMicrosoftSettings(): MicrosoftSettingsState {
	const { settings, microsoft } = useContainer();
	const preferences = useObservable(settings).microsoft;
	const status = useObservable(microsoft);
	const [eligibility, setEligibility] = useState<MicrosoftEligibility | null>(null);
	useEffect(() => {
		let current = true;
		void microsoft.eligibility().then((result) => {
			if (current) {
				setEligibility(result);
			}
		});
		return () => {
			current = false;
		};
	}, [microsoft, status]);
	const connected = microsoft.connected;
	return {
		note: eligibility === null ? null : MICROSOFT_NOTES[eligibility],
		enabled: eligibility === "eligible",
		receive: connected && preferences.receive,
		send: connected && preferences.send,
		intervalMinutes: preferences.intervalMinutes,
		setDirection: (key, on) => {
			if (microsoft.connected) {
				settings.changeMicrosoft({ [key]: on });
				return;
			}
			settings.changeMicrosoft({ receive: key === "receive", send: key === "send" });
			void microsoft.accept();
		},
		setInterval: (minutes) =>
			settings.changeMicrosoft({ intervalMinutes: AppSettings.minutes(minutes) }),
	};
}

export interface AccountAction {
	readonly label: string;
	readonly run: () => void;
}

export function useAccountAction(): AccountAction | null {
	const { auth } = useContainer();
	const { t } = useI18n();
	const logOut = useLogOut();
	const actions = {
		logOut: logOut === null ? null : { label: t("account.logOut"), run: logOut },
		signOut: auth.automatic ? null : { label: t("signOut.button"), run: () => void auth.signOut() },
	};
	return actions[sidebarMetrics().accountAction];
}
