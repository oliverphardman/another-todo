import type { MessageKey } from "../i18n/en-us";

export type SortKey = "importance" | "alphabetical" | "due" | "created" | "myDay";

export type ThemeSetting =
	| { readonly type: "color"; readonly color: string }
	| { readonly type: "photo"; readonly photoId: string };

export interface ViewSettingsData {
	readonly id: string;
	readonly sort: SortKey | null;
	readonly sortDescending?: boolean;
	readonly hideCompleted: boolean;
	readonly theme: ThemeSetting | null;
}

export interface ViewSettingsChanges {
	readonly sort?: SortKey | null;
	readonly sortDescending?: boolean;
	readonly hideCompleted?: boolean;
	readonly theme?: ThemeSetting | null;
}

export const DEFAULT_THEME_COLOR = "#2564cf";
export const LIST_THEME_COLOR = "#6074c3";

const VIEW_THEME_COLORS: Record<string, string> = {
	"my-day": DEFAULT_THEME_COLOR,
	important: DEFAULT_THEME_COLOR,
	all: "#f9e7de",
	planned: "#d5f1ee",
};

export const THEME_COLORS: readonly { readonly nameKey: MessageKey; readonly hex: string }[] = [
	{ nameKey: "color.blue", hex: DEFAULT_THEME_COLOR },
	{ nameKey: "color.periwinkle", hex: LIST_THEME_COLOR },
	{ nameKey: "color.red", hex: "#c0392b" },
	{ nameKey: "color.orange", hex: "#d9791f" },
	{ nameKey: "color.green", hex: "#3a8a4a" },
	{ nameKey: "color.teal", hex: "#2e7c80" },
	{ nameKey: "color.purple", hex: "#6b5bb5" },
	{ nameKey: "color.pink", hex: "#c4488a" },
	{ nameKey: "color.brown", hex: "#8a5a44" },
	{ nameKey: "color.gray", hex: "#5f6b7a" },
	{ nameKey: "color.peach", hex: "#f9e7de" },
	{ nameKey: "color.mint", hex: "#d5f1ee" },
];

export const SORT_OPTIONS: readonly { readonly key: SortKey; readonly labelKey: MessageKey }[] = [
	{ key: "importance", labelKey: "sort.importance" },
	{ key: "alphabetical", labelKey: "sort.alphabetical" },
	{ key: "due", labelKey: "sort.due" },
	{ key: "created", labelKey: "sort.created" },
	{ key: "myDay", labelKey: "sort.myDay" },
];

export class ViewDefaults {
	static themeColor(viewId: string): string {
		return VIEW_THEME_COLORS[viewId] ?? LIST_THEME_COLOR;
	}
}

export class ViewSettings {
	constructor(readonly data: ViewSettingsData) {}

	static defaults(id: string): ViewSettings {
		return new ViewSettings({ id, sort: null, hideCompleted: false, theme: null });
	}

	get id(): string {
		return this.data.id;
	}

	get sort(): SortKey | null {
		return this.data.sort;
	}

	get sortDescending(): boolean {
		return this.data.sortDescending ?? false;
	}

	get hideCompleted(): boolean {
		return this.data.hideCompleted;
	}

	get theme(): ThemeSetting | null {
		return this.data.theme;
	}

	with(changes: ViewSettingsChanges): ViewSettings {
		return new ViewSettings({
			...this.data,
			...(changes.sort !== undefined && { sort: changes.sort }),
			...(changes.sortDescending !== undefined && { sortDescending: changes.sortDescending }),
			...(changes.hideCompleted !== undefined && { hideCompleted: changes.hideCompleted }),
			...(changes.theme !== undefined && { theme: changes.theme }),
		});
	}
}
