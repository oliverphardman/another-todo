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

export class AppSettings extends Observable<AppSettingsState> {
	constructor(private readonly storage: KeyValueStore) {
		super(DEFAULT_SETTINGS);
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
			this.set(AppSettings.parse(JSON.parse(raw) as unknown));
		} catch {
			return;
		}
	}

	change(changes: Partial<AppSettingsState>): void {
		this.set({ ...this.get(), ...changes });
		void this.storage.set(KEY, JSON.stringify(this.get()));
	}

	changeMicrosoft(changes: Partial<MicrosoftPreferences>): void {
		this.change({ microsoft: { ...this.get().microsoft, ...changes } });
	}

	changeMyDay(changes: Partial<MyDayPreferences>): void {
		this.change({ myDay: { ...this.get().myDay, ...changes } });
	}

	showList(list: OptionalList, shown: boolean): void {
		this.change({ lists: { ...this.get().lists, [list]: shown } });
	}

	private static parse(value: unknown): AppSettingsState {
		const saved = AppSettings.section(value);
		const microsoft = AppSettings.section(saved.microsoft);
		const lists = AppSettings.section(saved.lists);
		const myDay = AppSettings.section(saved.myDay);
		const defaults = DEFAULT_SETTINGS;
		const flag = (stored: unknown, fallback: boolean) =>
			typeof stored === "boolean" ? stored : fallback;
		const minutes = microsoft.intervalMinutes;
		return {
			rowStyle: saved.rowStyle === "compact" ? "compact" : defaults.rowStyle,
			addTaskPosition: saved.addTaskPosition === "bottom" ? "bottom" : defaults.addTaskPosition,
			microsoft: {
				receive: flag(microsoft.receive, defaults.microsoft.receive),
				send: flag(microsoft.send, defaults.microsoft.send),
				intervalMinutes:
					typeof minutes === "number"
						? AppSettings.minutes(minutes)
						: defaults.microsoft.intervalMinutes,
			},
			lists: {
				all: flag(lists.all, defaults.lists.all),
				important: flag(lists.important, defaults.lists.important),
				planned: flag(lists.planned, defaults.lists.planned),
				completed: flag(lists.completed, defaults.lists.completed),
			},
			myDay: {
				yesterday: flag(myDay.yesterday, defaults.myDay.yesterday),
				dueToday: flag(myDay.dueToday, defaults.myDay.dueToday),
			},
		};
	}

	private static section(value: unknown): Saved {
		return typeof value === "object" && value !== null ? (value as Saved) : {};
	}
}
