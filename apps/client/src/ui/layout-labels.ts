import type { MessageKey } from "../i18n/en-us";
import type { LayoutStyle } from "../state/app-settings";

export const STYLE_LABELS: Readonly<Record<LayoutStyle, MessageKey>> = {
	cozy: "settings.styleCozy",
	compact: "settings.styleCompact",
};
