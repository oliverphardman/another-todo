import type { KeyValueStore } from "../storage/key-value-store";
import { Observable } from "./observable";

export type RowStyle = "cozy" | "compact";
export type AddTaskPosition = "top" | "bottom";

export const OPTIONAL_LISTS = ["all", "important", "planned", "completed"] as const;
export type OptionalList = (typeof OPTIONAL_LISTS)[number];

export const SYNC_MINUTES = { min: 1, max: 1440 } as const;

export interface MicrosoftPreferences {
	readonly receive: boolean;
	readonly send: boolean;
	readonly intervalMinutes: number;
}

export interface MyDayPreferences {
	readonly yesterday: boolean;
	readonly dueToday: boolean;
}

export interface AppSettingsState {
	readonly rowStyle: RowStyle;
	readonly addTaskPosition: AddTaskPosition;
	readonly microsoft: MicrosoftPreferences;
	readonly lists: Readonly<Record<OptionalList, boolean>>;
	readonly myDay: MyDayPreferences;
}

export const DEFAULT_SETTINGS: AppSettingsState = {
	rowStyle: "cozy",
	addTaskPosition: "top",
	microsoft: { receive: true, send: true, intervalMinutes: 2 },
	lists: { all: true, important: true, planned: true, completed: true },
	myDay: { yesterday: false, dueToday: true },
};

const KEY = "atd.settings";

type Saved = Readonly<Record<string, unknown>>;

export interface SettingsChanges {
	readonly rowStyle?: RowStyle;
	readonly addTaskPosition?: AddTaskPosition;
	readonly microsoft?: Partial<MicrosoftPreferences>;
	readonly lists?: Partial<Record<OptionalList, boolean>>;
	readonly myDay?: Partial<MyDayPreferences>;
}

export class AppSettings extends Observable<AppSettingsState> {
	private readonly defaults: AppSettingsState;
	private overrides: Saved = {};

	constructor(
		private readonly storage: KeyValueStore,
		serverDefaults: unknown = null,
	) {
		const defaults = AppSettings.resolve(serverDefaults, DEFAULT_SETTINGS);
		super(defaults);
		this.defaults = defaults;
	}

	get rowStyleChosen(): boolean {
		return this.overrides.rowStyle !== undefined;
	}

	static minutes(value: number): number {
		return Math.round(Math.min(SYNC_MINUTES.max, Math.max(SYNC_MINUTES.min, value)));
	}

	async load(): Promise<void> {
		const raw = await this.storage.get(KEY);
		if (raw === null) {
			return;
		}
		try {
			this.overrides = AppSettings.section(JSON.parse(raw) as unknown);
		} catch {
			return;
		}
		this.set(AppSettings.resolve(this.overrides, this.defaults));
	}

	change(changes: SettingsChanges): void {
		const merged: Record<string, unknown> = { ...this.overrides };
		for (const [name, value] of Object.entries(changes)) {
			merged[name] =
				typeof value === "object" ? { ...AppSettings.section(merged[name]), ...value } : value;
		}
		this.overrides = merged;
		this.set(AppSettings.resolve(merged, this.defaults));
		void this.storage.set(KEY, JSON.stringify(merged));
	}

	changeMicrosoft(microsoft: Partial<MicrosoftPreferences>): void {
		this.change({ microsoft });
	}

	changeMyDay(myDay: Partial<MyDayPreferences>): void {
		this.change({ myDay });
	}

	showList(list: OptionalList, shown: boolean): void {
		this.change({ lists: { [list]: shown } });
	}

	private static resolve(value: unknown, fallback: AppSettingsState): AppSettingsState {
		const saved = AppSettings.section(value);
		const microsoft = AppSettings.section(saved.microsoft);
		const lists = AppSettings.section(saved.lists);
		const myDay = AppSettings.section(saved.myDay);
		const flag = (stored: unknown, otherwise: boolean) =>
			typeof stored === "boolean" ? stored : otherwise;
		const choice = <T extends string>(stored: unknown, choices: readonly T[], otherwise: T) =>
			choices.find((candidate) => candidate === stored) ?? otherwise;
		const minutes = microsoft.intervalMinutes;
		return {
			rowStyle: choice(saved.rowStyle, ["cozy", "compact"], fallback.rowStyle),
			addTaskPosition: choice(saved.addTaskPosition, ["top", "bottom"], fallback.addTaskPosition),
			microsoft: {
				receive: flag(microsoft.receive, fallback.microsoft.receive),
				send: flag(microsoft.send, fallback.microsoft.send),
				intervalMinutes:
					typeof minutes === "number"
						? AppSettings.minutes(minutes)
						: fallback.microsoft.intervalMinutes,
			},
			lists: {
				all: flag(lists.all, fallback.lists.all),
				important: flag(lists.important, fallback.lists.important),
				planned: flag(lists.planned, fallback.lists.planned),
				completed: flag(lists.completed, fallback.lists.completed),
			},
			myDay: {
				yesterday: flag(myDay.yesterday, fallback.myDay.yesterday),
				dueToday: flag(myDay.dueToday, fallback.myDay.dueToday),
			},
		};
	}

	private static section(value: unknown): Saved {
		return typeof value === "object" && value !== null ? (value as Saved) : {};
	}
}
