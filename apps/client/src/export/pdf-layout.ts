import type { Task } from "../domain/task";
import type { I18n } from "../i18n/i18n";
import {
	ListPrintDocument,
	type PrintableBook,
	type PrintableList,
} from "../print/list-print-document";

export const A4 = { width: 595, height: 842 } as const;

const MARGIN = 48;
const INDENT = 18;
const LEADING = 1.4;

export interface TextStyle {
	readonly size: number;
	readonly bold: boolean;
	readonly color: string;
	readonly struck: boolean;
}

export interface PlacedText extends TextStyle {
	readonly text: string;
	readonly x: number;
	readonly y: number;
	readonly width: number;
}

export type TextMeasure = (text: string, style: TextStyle) => number;

interface Block {
	readonly text: string;
	readonly style: TextStyle;
	readonly indent?: number;
	readonly before?: number;
	readonly keepWithNext?: number;
}

const style = (size: number, color = "#222222", bold = false, struck = false): TextStyle => ({
	size,
	color,
	bold,
	struck,
});

const TITLE = style(20, "#222222", true);
const SUBTITLE = style(11, "#555555");
const HEADING = style(13, "#555555", true);
const OPEN = style(11);
const DONE = style(11, "#777777", false, true);
const DETAIL = style(9, "#666666");

export class PdfLayout {
	constructor(private readonly measure: TextMeasure) {}

	pages(book: PrintableBook, i18n: I18n): PlacedText[][] {
		const pages: PlacedText[][] = [[]];
		let top = MARGIN;
		for (const block of book.lists.flatMap((list) => PdfLayout.blocks(list, i18n))) {
			const indent = block.indent ?? 0;
			const height = block.style.size * LEADING;
			const x = MARGIN + indent;
			const lines = this.wrap(block.text, block.style, A4.width - MARGIN - x);
			top += top === MARGIN ? 0 : (block.before ?? 0);
			if (top + height + (block.keepWithNext ?? 0) > A4.height - MARGIN && top > MARGIN) {
				pages.push([]);
				top = MARGIN;
			}
			for (const text of lines) {
				if (top + height > A4.height - MARGIN) {
					pages.push([]);
					top = MARGIN;
				}
				pages.at(-1)!.push({
					...block.style,
					text,
					x,
					y: top + block.style.size,
					width: this.measure(text, block.style),
				});
				top += height;
			}
		}
		return pages;
	}

	private static blocks(list: PrintableList, i18n: I18n): Block[] {
		const tasksUnder = (heading: string, tasks: readonly Task[]): Block[] =>
			tasks.length === 0
				? []
				: [
						{ text: heading, style: HEADING, before: 14, keepWithNext: 24 },
						...tasks.flatMap((task) => PdfLayout.task(task, list.today, i18n)),
					];
		return [
			{ text: list.title, style: TITLE, before: 28, keepWithNext: 60 },
			...(list.subtitle === null ? [] : [{ text: list.subtitle, style: SUBTITLE }]),
			...tasksUnder(i18n.t("print.todo"), list.open),
			...tasksUnder(i18n.t("print.completed"), list.done),
		];
	}

	private static task(task: Task, today: string, i18n: I18n): Block[] {
		const details = ListPrintDocument.details(task, today, i18n);
		const detail = (text: string): Block => ({ text, style: DETAIL, indent: INDENT });
		return [
			{
				text: `${PdfLayout.box(task.completed)} ${task.title}`,
				style: task.completed ? DONE : OPEN,
				before: 6,
			},
			...(details === "" ? [] : [detail(details)]),
			...task.steps.map((step) => detail(`${PdfLayout.box(step.completed)} ${step.title}`)),
			...(task.note === "" ? [] : [detail(task.note)]),
		];
	}

	private static box(checked: boolean): string {
		return checked ? "☑" : "☐";
	}

	private wrap(text: string, textStyle: TextStyle, width: number): string[] {
		const fits = (line: string) => this.measure(line, textStyle) <= width;
		return text.split(/\r\n|\r|\n/).flatMap((paragraph) => {
			const lines: string[] = [];
			let line = "";
			for (const word of paragraph.replaceAll("\t", " ").split(/(?<= )/)) {
				if (fits((line + word).trimEnd())) {
					line += word;
					continue;
				}
				if (fits(word.trimEnd())) {
					lines.push(line.trimEnd());
					line = word;
					continue;
				}
				for (const character of word) {
					if (line !== "" && !fits(line + character)) {
						lines.push(line.trimEnd());
						line = "";
					}
					line += character;
				}
			}
			lines.push(line.trimEnd());
			return lines;
		});
	}
}
