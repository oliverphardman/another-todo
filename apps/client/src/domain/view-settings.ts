export type SortKey = "importance" | "alphabetical" | "due" | "created" | "myDay";

export type ThemeSetting =
	| { readonly type: "color"; readonly color: string }
	| { readonly type: "photo"; readonly photoId: string };

export interface ViewSettingsData {
	readonly id: string;
	readonly sort: SortKey | null;
	readonly hideCompleted: boolean;
	readonly theme: ThemeSetting | null;
}

export interface ViewSettingsChanges {
	readonly sort?: SortKey | null;
	readonly hideCompleted?: boolean;
	readonly theme?: ThemeSetting | null;
}

export const DEFAULT_THEME_COLOR = "#2564cf";

export const THEME_COLORS: readonly { readonly name: string; readonly hex: string }[] = [
	{ name: "Blue", hex: DEFAULT_THEME_COLOR },
	{ name: "Red", hex: "#c0392b" },
	{ name: "Orange", hex: "#d9791f" },
	{ name: "Green", hex: "#3a8a4a" },
	{ name: "Teal", hex: "#2e7c80" },
	{ name: "Purple", hex: "#6b5bb5" },
	{ name: "Pink", hex: "#c4488a" },
	{ name: "Brown", hex: "#8a5a44" },
	{ name: "Gray", hex: "#5f6b7a" },
];

export const SORT_OPTIONS: readonly { readonly key: SortKey; readonly label: string }[] = [
	{ key: "importance", label: "Importance" },
	{ key: "alphabetical", label: "Alphabetically" },
	{ key: "due", label: "Due Date" },
	{ key: "created", label: "Creation Date" },
	{ key: "myDay", label: "Added to My Day" },
];

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
			...(changes.hideCompleted !== undefined && { hideCompleted: changes.hideCompleted }),
			...(changes.theme !== undefined && { theme: changes.theme }),
		});
	}
}
