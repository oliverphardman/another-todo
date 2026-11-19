import type { Task } from "../domain/task";
import type { I18n } from "../i18n/i18n";

export interface PrintableList {
	readonly title: string;
	readonly subtitle: string | null;
	readonly open: readonly Task[];
	readonly done: readonly Task[];
	readonly today: string;
}

export interface ListPrinter {
	print(html: string): Promise<void>;
}

const ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export class ListPrintDocument {
	static html(list: PrintableList, i18n: I18n): string {
		const section = (heading: string, tasks: readonly Task[]) =>
			tasks.length === 0
				? ""
				: `<h2>${heading}</h2><ul>${tasks.map((task) => ListPrintDocument.item(task, list.today, i18n)).join("")}</ul>`;
		return [
			'<!doctype html><html><head><meta charset="utf-8"><title>',
			ListPrintDocument.escape(list.title),
			"</title><style>",
			"body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;margin:32px;color:#222}",
			"h1{margin:0 0 4px}h2{font-size:16px;margin:24px 0 8px;color:#555}",
			".subtitle{color:#555;margin:0 0 16px}ul{list-style:none;padding:0;margin:0}",
			"li{padding:6px 0;border-bottom:1px solid #eee}.meta{color:#666;font-size:12px;margin-left:24px}",
			".steps{margin:4px 0 0 24px}.note{white-space:pre-wrap;margin:4px 0 0 24px;color:#444}",
			".done{text-decoration:line-through;color:#777}",
			"</style></head><body><h1>",
			ListPrintDocument.escape(list.title),
			"</h1>",
			list.subtitle === null
				? ""
				: `<p class="subtitle">${ListPrintDocument.escape(list.subtitle)}</p>`,
			section(i18n.t("print.todo"), list.open),
			section(i18n.t("print.completed"), list.done),
			"</body></html>",
		].join("");
	}

	private static item(task: Task, today: string, i18n: I18n): string {
		const meta = [
			task.dueDay === null
				? null
				: i18n.t("detail.due", { when: i18n.dueLabel(task.dueDay, today) }),
			task.important ? i18n.t("print.important") : null,
		].filter((part): part is string => part !== null);
		const steps = task.steps
			.map(
				(step) =>
					`<div>${step.completed ? "&#9745;" : "&#9744;"} ${ListPrintDocument.escape(step.title)}</div>`,
			)
			.join("");
		return [
			"<li>",
			`<span class="${task.completed ? "done" : ""}">${task.completed ? "&#9745;" : "&#9744;"} ${ListPrintDocument.escape(task.title)}</span>`,
			meta.length === 0
				? ""
				: `<div class="meta">${ListPrintDocument.escape(meta.join(" · "))}</div>`,
			steps === "" ? "" : `<div class="steps">${steps}</div>`,
			task.note === "" ? "" : `<div class="note">${ListPrintDocument.escape(task.note)}</div>`,
			"</li>",
		].join("");
	}

	private static escape(text: string): string {
		return text.replace(/[&<>"']/g, (character) => ESCAPES[character]!);
	}
}
