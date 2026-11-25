import { useEffect } from "react";
import { LICENSE_TEXT, REPOSITORY_URL } from "../config/project";
import type { ServerSession, ServerState } from "../config/server-session";
import { useI18n } from "../i18n/i18n-context";
import { About } from "./about";
import { useObservable } from "./hooks";

function addressOf(state: ServerState): string | null {
	if (state.status === "ready") {
		return state.config.serverUrl;
	}
	return state.status === "unreachable" ? state.url : null;
}

export function AboutSync({ session }: { session: ServerSession }) {
	const { t } = useI18n();
	const serverUrl = addressOf(useObservable(session));
	useEffect(() => {
		About.bridge.describe({
			serverLabel: t("about.server"),
			serverUrl,
			sourceLabel: t("about.source"),
			sourceUrl: REPOSITORY_URL,
			license: LICENSE_TEXT,
		});
	}, [serverUrl, t]);
	return null;
}
