import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { Bytes } from "../src/export/bytes";
import { CsvExportFormat } from "../src/export/csv-export-format";
import type { ExportDocument } from "../src/export/export-document";
import { ExportFileName } from "../src/export/export-file-name";
import { JsonExportFormat } from "../src/export/json-export-format";
import { PdfExportFormat } from "../src/export/pdf-export-format";
import { XlsxExportFormat } from "../src/export/xlsx-export-format";
import { ZipArchive } from "../src/export/zip-archive";
import { I18n } from "../src/i18n/i18n";
import type { PrintableBook } from "../src/print/list-print-document";
import { unzip } from "./support/unzip";

const i18n = new I18n();
const decode = (bytes: Uint8Array) => new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);

const full = Task.create("1", 'Say "hi", then\nleave', "2026-11-01T10:00:00.000Z").with({
	completed: true,
	importance: "high",
	dueDate: "2026-11-20T00:00:00.000Z",
	remindAt: "2026-11-20T09:00:00.000Z",
	repeat: { frequency: "daily" },
	steps: [
		{ id: "a", title: "One", completed: true },
		{ id: "b", title: "Two", completed: false },
	],
	note: "<b>&\u0007\r_x0041_",
});
const plain = Task.create("2", "=SUM(A1)", "2026-11-02T10:00:00.000Z");

const document: ExportDocument = {
	title: "Home",
	today: "2026-11-19",
	exportedAt: "2026-11-19T12:00:00.000Z",
	lists: [
		{
			name: "Home",
			group: "Life",
			subtitle: null,
			tasks: [
				{ task: full, list: "Home", group: "Life", inMyDay: true },
				{ task: plain, list: "Home", group: null, inMyDay: false },
			],
		},
	],
};

describe("CSV export", () => {
	it("writes a spreadsheet friendly table that cannot run formulas", async () => {
		const format = new CsvExportFormat();
		expect([format.extension, format.contentType]).toEqual(["csv", "text/csv"]);
		const text = decode(await format.encode(document, i18n));
		expect(text.startsWith("﻿Group,List,Title,Completed,Important,Due date,")).toBe(true);
		expect(text).toContain(
			'Life,Home,"Say ""hi"", then\nleave",Yes,Yes,2026-11-20,2026-11-20T09:00:00.000Z,Daily,Yes,"[x] One\n[ ] Two",',
		);
		expect(text).toContain(",Home,'=SUM(A1),No,No,,,,No,,,2026-11-02T10:00:00.000Z\r\n");
	});

	it("keeps leading and trailing spaces and neutralizes every formula prefix", async () => {
		const titles = [" padded ", "+1", "-1", "@a", "\tb"];
		const text = decode(
			await new CsvExportFormat().encode(
				{
					...document,
					lists: [
						{
							...document.lists[0]!,
							tasks: titles.map((title) => ({
								task: Task.create(title, title, "x"),
								list: "L",
								group: null,
								inMyDay: false,
							})),
						},
					],
				},
				i18n,
			),
		);
		for (const cell of [',L," padded ",', ",L,'+1,", ",L,'-1,", ",L,'@a,", ",L,'\tb,"]) {
			expect(text).toContain(cell);
		}
	});
});

describe("JSON export", () => {
	it("keeps every field of every list", async () => {
		const format = new JsonExportFormat();
		expect([format.extension, format.contentType]).toEqual(["json", "application/json"]);
		const parsed = JSON.parse(decode(await format.encode(document))) as unknown;
		expect(parsed).toMatchObject({
			version: 1,
			exportedAt: "2026-11-19T12:00:00.000Z",
			lists: [
				{
					name: "Home",
					group: "Life",
					tasks: [
						{
							id: "1",
							completed: true,
							important: true,
							dueDate: "2026-11-20",
							repeat: { frequency: "daily" },
							myDay: true,
							steps: [
								{ title: "One", completed: true },
								{ title: "Two", completed: false },
							],
						},
						{ id: "2", dueDate: null, remindAt: null, repeat: null, group: null },
					],
				},
			],
		});
	});
});

describe("XLSX export", () => {
	it("builds a workbook with a frozen header and safe text cells", async () => {
		const format = new XlsxExportFormat();
		expect(format.extension).toBe("xlsx");
		expect(format.contentType).toContain("spreadsheetml.sheet");
		const parts = unzip(await format.encode(document, i18n));
		expect([...parts.keys()]).toEqual([
			"[Content_Types].xml",
			"_rels/.rels",
			"xl/workbook.xml",
			"xl/_rels/workbook.xml.rels",
			"xl/styles.xml",
			"xl/worksheets/sheet1.xml",
		]);
		for (const xml of parts.values()) {
			const parsed = new DOMParser().parseFromString(xml, "application/xml");
			expect(parsed.querySelector("parsererror")).toBeNull();
		}
		expect(parts.get("xl/workbook.xml")).toContain('<sheet name="Tasks"');
		const sheet = parts.get("xl/worksheets/sheet1.xml")!;
		expect(sheet).toContain('state="frozen"');
		expect(sheet).toContain('<c r="A1" s="1" t="inlineStr">');
		expect(sheet).toContain('<c r="L3" s="0" t="inlineStr">');
		expect(sheet).toContain("&lt;b&gt;&amp;&#13;_x005F_x0041_");
		expect(sheet).toContain(">=SUM(A1)<");
	});

	it("shortens cells beyond what a spreadsheet can hold", async () => {
		const long = Task.create("3", "t", "x").with({ note: "n".repeat(40000) });
		const parts = unzip(
			await new XlsxExportFormat().encode(
				{
					...document,
					lists: [
						{
							...document.lists[0]!,
							tasks: [{ task: long, list: "L", group: null, inMyDay: false }],
						},
					],
				},
				i18n,
			),
		);
		const longest = parts.get("xl/worksheets/sheet1.xml")!.match(/n{100,}/)![0];
		expect(longest).toHaveLength(32767);
	});

	it("matches the standard checksum", () => {
		const data = Bytes.utf8("The quick brown fox");
		expect(ZipArchive.checksum(data)).toBe(crc32(data));
	});
});

describe("PDF export", () => {
	it("hands the renderer each list split into open and completed tasks", async () => {
		const books: PrintableBook[] = [];
		const format = new PdfExportFormat({
			render: async (book) => {
				books.push(book);
				return new Uint8Array([1]);
			},
		});
		expect([format.extension, format.contentType]).toEqual(["pdf", "application/pdf"]);
		expect(await format.encode(document, i18n)).toEqual(new Uint8Array([1]));
		expect(books[0]).toMatchObject({
			title: "Home",
			lists: [{ title: "Home", today: "2026-11-19", open: [plain], done: [full] }],
		});
	});
});

describe("bytes", () => {
	it("encodes text as UTF-8, replacing broken surrogates", () => {
		const text = "a é € 🛒";
		expect([...Bytes.utf8(text)]).toEqual([...new TextEncoder().encode(text)]);
		expect([...Bytes.utf8("\ud800")]).toEqual([0xef, 0xbf, 0xbd]);
	});

	it("round trips base64 of any length", () => {
		for (let length = 0; length < 8; length++) {
			const bytes = Uint8Array.from({ length }, (_, index) => 250 - index * 31);
			const encoded = Bytes.toBase64(bytes);
			expect(encoded).toBe(Buffer.from(bytes).toString("base64"));
			expect([...Bytes.fromBase64(`${encoded}\n`)]).toEqual([...bytes]);
		}
	});
});

describe("export file names", () => {
	it("removes what file systems reject", () => {
		expect(ExportFileName.of('a/b\\c:d*e?f"g<h>i|j\u0001', "csv", "App")).toBe(
			"a b c d e f g h i j.csv",
		);
		expect(ExportFileName.of("  🛒 Shopping.  ", "pdf", "App")).toBe("🛒 Shopping.pdf");
		expect(ExportFileName.of("x".repeat(200), "json", "App")).toBe(`${"x".repeat(80)}.json`);
	});

	it("falls back when nothing usable is left", () => {
		for (const title of ["", "..", "///", "CON", "lpt1"]) {
			expect(ExportFileName.of(title, "csv", "App")).toBe("App.csv");
		}
	});
});
