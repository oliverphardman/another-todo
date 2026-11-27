import type { MessageKey } from "../i18n/en-us";
import type { I18n } from "../i18n/i18n";
import type { ExportDocument, ExportedTask } from "./export-document";

interface Column {
	readonly heading: MessageKey;
	readonly width: number;
	readonly value: (entry: ExportedTask, i18n: I18n) => string;
}

const yesNo = (value: boolean, i18n: I18n): string => i18n.t(value ? "export.yes" : "export.no");

const COLUMNS: readonly Column[] = [
	{ heading: "export.column.group", width: 18, value: (entry) => entry.group ?? "" },
	{ heading: "export.column.list", width: 18, value: (entry) => entry.list },
	{ heading: "export.column.title", width: 44, value: ({ task }) => task.title },
	{
		heading: "export.column.completed",
		width: 12,
		value: ({ task }, i18n) => yesNo(task.completed, i18n),
	},
	{
		heading: "export.column.important",
		width: 12,
		value: ({ task }, i18n) => yesNo(task.important, i18n),
	},
	{ heading: "export.column.due", width: 14, value: ({ task }) => task.dueDay ?? "" },
	{ heading: "export.column.reminder", width: 26, value: ({ task }) => task.remindAt ?? "" },
	{
		heading: "export.column.repeat",
		width: 18,
		value: ({ task }, i18n) => (task.repeat === null ? "" : i18n.repeatLabel(task.repeat)),
	},
	{
		heading: "export.column.myDay",
		width: 10,
		value: ({ inMyDay }, i18n) => yesNo(inMyDay, i18n),
	},
	{
		heading: "export.column.steps",
		width: 36,
		value: ({ task }) =>
			task.steps.map((step) => `[${step.completed ? "x" : " "}] ${step.title}`).join("\n"),
	},
	{ heading: "export.column.note", width: 44, value: ({ task }) => task.note },
	{ heading: "export.column.created", width: 26, value: ({ task }) => task.createdAt },
];

export class ExportTable {
	private constructor(
		readonly widths: readonly number[],
		readonly header: readonly string[],
		readonly rows: readonly (readonly string[])[],
	) {}

	static from(document: ExportDocument, i18n: I18n): ExportTable {
		return new ExportTable(
			COLUMNS.map((column) => column.width),
			COLUMNS.map((column) => i18n.t(column.heading)),
			document.lists.flatMap((list) =>
				list.tasks.map((entry) => COLUMNS.map((column) => column.value(entry, i18n))),
			),
		);
	}
}
