import { ViewDefaults, type ThemeSetting } from "../domain/view-settings";
import { ColorMath } from "./color-math";

const ICON_COLORS: Readonly<Record<string, string>> = {
	"my-day": "#8a939c",
	important: "#d06c8c",
	planned: "#7fc4bd",
	all: "#d9a987",
	completed: "#c9786a",
	tasks: "#6f7fe0",
};

const MINIMUM_CONTRAST = 3;

export class SidebarColors {
	static icon(viewId: string, theme: ThemeSetting | null, sidebar: string, dark: boolean): string {
		const chosen =
			theme?.type === "color"
				? theme.color
				: (ICON_COLORS[viewId] ?? ViewDefaults.themeColor(viewId));
		const color = dark ? ColorMath.mix(chosen, "#ffffff", 0.2) : chosen;
		return ColorMath.ensureContrast(color, sidebar, MINIMUM_CONTRAST, dark ? "#ffffff" : "#000000");
	}
}
