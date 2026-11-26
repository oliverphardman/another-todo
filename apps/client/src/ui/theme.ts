export interface Palette {
	readonly background: string;
	readonly sidebar: string;
	readonly sidebarSelected: string;
	readonly sidebarHover: string;
	readonly sidebarField: string;
	readonly surface: string;
	readonly surfaceHover: string;
	readonly detail: string;
	readonly text: string;
	readonly textSecondary: string;
	readonly onAccent: string;
	readonly accent: string;
	readonly accentSoft: string;
	readonly border: string;
	readonly danger: string;
	readonly overdue: string;
	readonly warning: string;
}

export const LIGHT: Palette = {
	background: "#2564cf",
	sidebar: "#f5f5f5",
	sidebarSelected: "#e1e1e1",
	sidebarHover: "#ebebeb",
	sidebarField: "#ffffff",
	surface: "#ffffff",
	surfaceHover: "#f5f5f5",
	detail: "#faf9f8",
	text: "#323130",
	textSecondary: "#605e5c",
	onAccent: "#ffffff",
	accent: "#2564cf",
	accentSoft: "#dbe7fa",
	border: "#e1dfdd",
	danger: "#a4262c",
	overdue: "#a4262c",
	warning: "#fff4ce",
};

export const DARK: Palette = {
	background: "#1e1e1e",
	sidebar: "#252525",
	sidebarSelected: "#3a3a3a",
	sidebarHover: "#2f2f2f",
	sidebarField: "#1b1b1b",
	surface: "#292929",
	surfaceHover: "#333333",
	detail: "#242424",
	text: "#ffffff",
	textSecondary: "#c8c6c4",
	onAccent: "#ffffff",
	accent: "#6ea0f5",
	accentSoft: "#27406e",
	border: "#3b3a39",
	danger: "#f1707b",
	overdue: "#f1707b",
	warning: "#433519",
};

export const FONT_FAMILY =
	'"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, "Helvetica Neue", Arial, sans-serif';

export type LayoutMode = "compact" | "medium" | "expanded";

export class Layout {
	static modeFor(width: number): LayoutMode {
		if (width < 700) {
			return "compact";
		}
		return width < 1100 ? "medium" : "expanded";
	}

	static sidebarWidth(mode: LayoutMode): number {
		return mode === "expanded" ? 280 : 240;
	}

	static detailWidth(mode: LayoutMode): number {
		return mode === "expanded" ? 320 : 300;
	}
}
