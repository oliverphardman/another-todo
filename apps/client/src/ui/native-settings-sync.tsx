import { useCallback, useEffect, useRef } from "react";
import { useI18n } from "../i18n/i18n-context";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { NativeSettings } from "./native-settings";
import { NativeSettingsForm } from "./native-settings-form";
import { useAccountAction, useMicrosoftSettings } from "./settings-state";

function useSignedOutMessage(): () => void {
	const { t } = useI18n();
	return useCallback(() => {
		if (NativeSettings.bridge.isAvailable()) {
			NativeSettings.bridge.show({
				sections: [
					{
						key: "signed-out",
						title: "",
						rows: [{ kind: "note", key: "signedOut", label: t("settings.signedOut") }],
					},
				],
			});
		}
	}, [t]);
}

export function NativeSettingsPlaceholder() {
	const show = useSignedOutMessage();
	useEffect(show, [show]);
	return null;
}

export function NativeSettingsSync() {
	return NativeSettings.bridge.isAvailable() ? <NativeSettingsWindow /> : null;
}

function NativeSettingsWindow() {
	const { settings, store, config } = useContainer();
	const i18n = useI18n();
	useObservable(settings);
	const { today } = useObservable(store);
	const microsoft = useMicrosoftSettings();
	const account = useAccountAction();
	const signedOut = useSignedOutMessage();
	const form = new NativeSettingsForm({
		settings,
		i18n,
		today,
		serverUrl: config.serverUrl,
		microsoft,
		account,
	});
	const latest = useRef(form);
	latest.current = form;
	const model = form.model;
	const shown = JSON.stringify(model);
	const bridge = NativeSettings.bridge;
	useEffect(() => bridge.show(model), [bridge, shown]);
	useEffect(() => {
		let listening = true;
		const listen = async () => {
			while (listening) {
				const change = await bridge.nextChange();
				if (listening && change !== null) {
					latest.current.apply(change.key, change.value);
				}
			}
		};
		listen().catch(() => undefined);
		return () => {
			listening = false;
			signedOut();
		};
	}, [bridge]);
	return null;
}
