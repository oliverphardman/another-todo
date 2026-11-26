import { Task } from "../domain/task";
import type { I18n } from "../i18n/i18n";
import { OPTIONAL_LISTS, type AppSettings } from "../state/app-settings";
import type { NativeSettingsModel, NativeSettingsRow } from "./native-settings";
import { rowMetrics } from "./row-metrics";
import type { AccountAction, MicrosoftSettingsState } from "./settings-state";

export interface NativeSettingsContext {
	readonly settings: AppSettings;
	readonly i18n: I18n;
	readonly today: string;
	readonly serverUrl: string;
	readonly microsoft: MicrosoftSettingsState;
	readonly account: AccountAction | null;
}

interface Field {
	readonly row: NativeSettingsRow;
	readonly apply?: (value: string) => void;
}

interface FieldSection {
	readonly key: string;
	readonly title: string;
	readonly fields: readonly Field[];
}

export class NativeSettingsForm {
	private readonly sections: readonly FieldSection[];

	constructor(context: NativeSettingsContext) {
		this.sections = [
			NativeSettingsForm.appearance(context),
			NativeSettingsForm.microsoft(context),
			NativeSettingsForm.server(context),
			NativeSettingsForm.lists(context),
			NativeSettingsForm.myDay(context),
			...NativeSettingsForm.account(context),
		];
	}

	get model(): NativeSettingsModel {
		return {
			sections: this.sections.map(({ key, title, fields }) => ({
				key,
				title,
				rows: fields.map((field) => field.row),
			})),
		};
	}

	apply(key: string, value: string): void {
		this.sections
			.flatMap((section) => section.fields)
			.find((field) => field.row.key === key && field.row.enabled !== false)
			?.apply?.(value);
	}

	private static toggle(
		key: string,
		label: string,
		checked: boolean,
		change: (checked: boolean) => void,
		extra: Pick<NativeSettingsRow, "detail" | "enabled"> = {},
	): Field {
		return {
			row: { kind: "toggle", key, label, value: String(checked), ...extra },
			apply: (value) => change(value === "true"),
		};
	}

	private static appearance({ settings, i18n, today }: NativeSettingsContext): FieldSection {
		const { t } = i18n;
		const { rowStyle, addTaskPosition } = settings.get();
		const preview = Task.create("settings-preview", t("settings.previewTask"), "");
		return {
			key: "appearance",
			title: t("settings.appearance"),
			fields: [
				{
					row: {
						kind: "choice",
						key: "rowStyle",
						label: t("settings.rowStyle"),
						value: rowStyle,
						options: [
							{ value: "cozy", label: t("settings.rowCozy") },
							{ value: "compact", label: t("settings.rowCompact") },
						],
					},
					apply: (value) => settings.change({ rowStyle: value === "compact" ? "compact" : "cozy" }),
				},
				{
					row: {
						kind: "preview",
						key: "preview",
						label: preview.title,
						detail: [t("view.tasks"), i18n.dueLabel(today, today)].join(" · "),
						height: rowMetrics(rowStyle).height,
					},
				},
				{
					row: {
						kind: "choice",
						key: "addTaskPosition",
						label: t("settings.addPosition"),
						value: addTaskPosition,
						options: [
							{ value: "top", label: t("settings.top") },
							{ value: "bottom", label: t("settings.bottom") },
						],
					},
					apply: (value) =>
						settings.change({ addTaskPosition: value === "bottom" ? "bottom" : "top" }),
				},
			],
		};
	}

	private static microsoft({ i18n, microsoft }: NativeSettingsContext): FieldSection {
		const { t } = i18n;
		const { enabled, note } = microsoft;
		const notes: Field[] =
			note === null ? [] : [{ row: { kind: "note", key: "microsoft.note", label: t(note) } }];
		return {
			key: "microsoft",
			title: t("settings.microsoft"),
			fields: [
				...notes,
				NativeSettingsForm.toggle(
					"microsoft.receive",
					t("settings.msReceive"),
					microsoft.receive,
					(on) => microsoft.setDirection("receive", on),
					{ enabled },
				),
				NativeSettingsForm.toggle(
					"microsoft.send",
					t("settings.msSend"),
					microsoft.send,
					(on) => microsoft.setDirection("send", on),
					{ enabled },
				),
				{
					row: {
						kind: "number",
						key: "microsoft.interval",
						label: t("settings.msEvery"),
						detail: t("settings.msMinutes"),
						value: String(microsoft.intervalMinutes),
						enabled,
					},
					apply: (value) => {
						const minutes = Number.parseInt(value, 10);
						if (!Number.isNaN(minutes)) {
							microsoft.setInterval(minutes);
						}
					},
				},
			],
		};
	}

	private static server({ i18n, serverUrl }: NativeSettingsContext): FieldSection {
		return {
			key: "server",
			title: i18n.t("settings.server"),
			fields: [
				{
					row: {
						kind: "text",
						key: "serverUrl",
						label: i18n.t("settings.serverUrl"),
						value: serverUrl,
						enabled: false,
					},
				},
			],
		};
	}

	private static lists({ settings, i18n }: NativeSettingsContext): FieldSection {
		const { t } = i18n;
		const { lists } = settings.get();
		return {
			key: "lists",
			title: t("settings.lists"),
			fields: [
				{ row: { kind: "note", key: "lists.note", label: t("settings.showLists") } },
				...OPTIONAL_LISTS.map((list) =>
					NativeSettingsForm.toggle(`list.${list}`, t(`view.${list}`), lists[list], (shown) =>
						settings.showList(list, shown),
					),
				),
			],
		};
	}

	private static myDay({ settings, i18n }: NativeSettingsContext): FieldSection {
		const { t } = i18n;
		const { myDay } = settings.get();
		return {
			key: "myDay",
			title: t("settings.myDay"),
			fields: [
				NativeSettingsForm.toggle(
					"myDay.yesterday",
					t("settings.yesterday"),
					myDay.yesterday,
					(yesterday) => settings.changeMyDay({ yesterday }),
					{ detail: t("settings.yesterdayHint") },
				),
				NativeSettingsForm.toggle(
					"myDay.dueToday",
					t("settings.dueToday"),
					myDay.dueToday,
					(dueToday) => settings.changeMyDay({ dueToday }),
				),
			],
		};
	}

	private static account({ account }: NativeSettingsContext): FieldSection[] {
		if (account === null) {
			return [];
		}
		return [
			{
				key: "account",
				title: "",
				fields: [
					{
						row: { kind: "button", key: "account", label: account.label },
						apply: () => account.run(),
					},
				],
			},
		];
	}
}
