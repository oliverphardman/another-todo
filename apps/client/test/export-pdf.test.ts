import { describe, expect, it, vi } from "vitest";
import { Task } from "../src/domain/task";
import { Bytes } from "../src/export/bytes";
import { CanvasPdfRenderer } from "../src/export/canvas-pdf-renderer";
import { HtmlPdfRenderer } from "../src/export/html-pdf-renderer";
import { ImagePdf } from "../src/export/image-pdf";
import { A4, PdfLayout, type TextMeasure } from "../src/export/pdf-layout";
import { I18n } from "../src/i18n/i18n";
import type { PrintableBook } from "../src/print/list-print-document";

const i18n = new I18n();
const measure: TextMeasure = (text, style) => Array.from(text).length * style.size * 0.5;
const latin = (bytes: Uint8Array) => Buffer.from(bytes).toString("latin1");

const book = (tasks: Task[], subtitle: string | null = null): PrintableBook => ({
	title: "Home",
	lists: [
		{
			title: "Home",
			subtitle,
			open: tasks.filter((task) => !task.completed),
			done: tasks.filter((task) => task.completed),
			today: "2026-11-19",
		},
	],
});

describe("PDF layout", () => {
	it("places titles, tasks and their details in reading order", () => {
		const open = Task.create("1", "Buy milk", "x").with({
			important: undefined,
			importance: "high",
			steps: [
				{ id: "a", title: "Find shop", completed: true },
				{ id: "b", title: "Pay", completed: false },
			],
			note: "Line one\r\nLine\ttwo",
		} as never);
		const done = Task.create("2", "Old", "x").with({ completed: true });
		const pages = new PdfLayout(measure).pages(book([open, done], "Thursday"), i18n);
		expect(pages).toHaveLength(1);
		expect(pages[0]!.map((text) => text.text)).toEqual([
			"Home",
			"Thursday",
			"To do",
			"☐ Buy milk",
			"Important",
			"☑ Find shop",
			"☐ Pay",
			"Line one",
			"Line two",
			"Completed",
			"☑ Old",
		]);
		expect(pages[0]!.at(-1)!.struck).toBe(true);
		const ys = pages[0]!.map((text) => text.y);
		expect(ys).toEqual([...ys].sort((a, b) => a - b));
	});

	it("wraps words and breaks text that has no spaces", () => {
		const tasks = [
			Task.create("1", "word ".repeat(60).trim(), "x"),
			Task.create("2", `see ${"漢".repeat(250)}`, "x"),
		];
		const placed = new PdfLayout(measure).pages(book(tasks), i18n).flat();
		expect(placed.length).toBeGreaterThan(6);
		for (const text of placed) {
			expect(text.x + text.width).toBeLessThanOrEqual(A4.width - 48);
		}
		const joined = placed.map((text) => text.text).join("");
		expect(joined.match(/漢/g)).toHaveLength(250);
		expect(joined.match(/word/g)).toHaveLength(60);
	});

	it("continues on new pages without crossing the margins", () => {
		const tasks = Array.from({ length: 120 }, (_, index) =>
			Task.create(`${index}`, `Task ${index}`, "x"),
		);
		const long = Task.create("n", "Long note", "x").with({ note: "line\n".repeat(90) });
		const pages = new PdfLayout(measure).pages(book([...tasks, long]), i18n);
		expect(pages.length).toBeGreaterThan(3);
		for (const text of pages.flat()) {
			expect(text.y).toBeGreaterThanOrEqual(48);
			expect(text.y).toBeLessThanOrEqual(A4.height - 48);
		}
	});

	it("never strands a heading at the foot of a page", () => {
		for (let count = 30; count < 45; count++) {
			const open = Array.from({ length: count }, (_, index) =>
				Task.create(`${index}`, "Open", "x"),
			);
			const done = Task.create("d", "Done", "x").with({ completed: true });
			const pages = new PdfLayout(measure).pages(book([...open, done]), i18n);
			for (const page of pages) {
				expect(page.at(-1)!.text).not.toBe("Completed");
			}
		}
	});
});

describe("image PDF", () => {
	it("writes one page per image with correct byte offsets", () => {
		const page = { jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), width: 2, height: 3 };
		const text = latin(ImagePdf.build([page, page], A4));
		expect(text.startsWith("%PDF-1.4")).toBe(true);
		expect(text).toContain("/Count 2 /Kids [3 0 R 6 0 R]");
		expect(text.match(/\/Filter \/DCTDecode/g)).toHaveLength(2);
		const table = Number(/startxref\n(\d+)/.exec(text)![1]);
		expect(text.slice(table, table + 4)).toBe("xref");
		const offsets = [...text.matchAll(/(\d{10}) 00000 n/g)].map((match) => Number(match[1]));
		expect(offsets).toHaveLength(8);
		offsets.forEach((offset, index) => {
			expect(text.slice(offset).startsWith(`${index + 1} 0 obj`)).toBe(true);
		});
	});
});

describe("canvas PDF renderer", () => {
	it("draws every page and wraps them into a PDF", async () => {
		const drawn: string[] = [];
		const context = {
			font: "",
			fillStyle: "",
			setTransform: vi.fn(),
			fillRect: vi.fn(),
			fillText: (text: string) => drawn.push(text),
			measureText: (text: string) => ({ width: text.length * 5 }),
		};
		const canvas = {
			width: 0,
			height: 0,
			getContext: () => context,
			toDataURL: () => `data:image/jpeg;base64,${Bytes.toBase64(new Uint8Array([9, 9]))}`,
		};
		const done = Task.create("2", "Old", "x").with({ completed: true });
		const pdf = await new CanvasPdfRenderer(() => canvas as never).render(
			book([Task.create("1", "New", "x"), done]),
			i18n,
		);
		expect(drawn).toContain("☐ New");
		expect(latin(pdf)).toContain("/Width 1190 /Height 1684");
		expect(context.fillRect).toHaveBeenCalledTimes(2);
	});

	it("fails clearly without a drawing surface", async () => {
		const canvas = { width: 0, height: 0, getContext: () => null };
		await expect(
			new CanvasPdfRenderer(() => canvas as never).render(book([]), i18n),
		).rejects.toThrow("drawing surface");
	});

	it("creates a canvas element by default", async () => {
		const create = vi.spyOn(document, "createElement").mockReturnValue({
			getContext: () => null,
		} as never);
		await expect(new CanvasPdfRenderer().render(book([]), i18n)).rejects.toThrow();
		expect(create).toHaveBeenCalledWith("canvas");
		create.mockRestore();
	});
});

describe("HTML PDF renderer", () => {
	it("converts one document holding every list", async () => {
		const convert = vi.fn(async () => Bytes.toBase64(new Uint8Array([1, 2, 3])));
		const two = book([Task.create("1", "A", "x")]);
		const pdf = await new HtmlPdfRenderer(convert).render(
			{ title: "All", lists: [...two.lists, ...two.lists] },
			i18n,
		);
		expect(pdf).toEqual(new Uint8Array([1, 2, 3]));
		const html = (convert.mock.calls[0] as unknown as string[])[0]!;
		expect(html).toContain("<title>All</title>");
		expect(html.match(/<section>/g)).toHaveLength(2);
	});
});
