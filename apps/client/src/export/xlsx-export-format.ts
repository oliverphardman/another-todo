import type { I18n } from "../i18n/i18n";
import type { ExportDocument } from "./export-document";
import { ExportFormat } from "./export-format";
import { ExportTable } from "./export-table";
import { ZipArchive } from "./zip-archive";

const CELL_LIMIT = 32767;
const SHEET_NAME_LIMIT = 31;
const DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const RELATIONS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PACKAGE = "http://schemas.openxmlformats.org/package/2006";
const CONTENT = "application/vnd.openxmlformats-officedocument.spreadsheetml";
const ILLEGAL = /[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu;
const ESCAPES: Readonly<Record<string, string>> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"\r": "&#13;",
};

export class XlsxExportFormat extends ExportFormat {
	readonly id = "xlsx";
	readonly labelKey = "export.xlsx";
	readonly contentType = `${CONTENT}.sheet`;

	async encode(document: ExportDocument, i18n: I18n): Promise<Uint8Array> {
		const table = ExportTable.from(document, i18n);
		const sheet = i18n
			.t("view.tasks")
			.replace(/[[\]:*?/\\]/g, " ")
			.slice(0, SHEET_NAME_LIMIT);
		return ZipArchive.build([
			{ path: "[Content_Types].xml", text: XlsxExportFormat.contentTypes() },
			{
				path: "_rels/.rels",
				text: XlsxExportFormat.relationships([["officeDocument", "xl/workbook.xml"]]),
			},
			{ path: "xl/workbook.xml", text: XlsxExportFormat.workbook(sheet) },
			{
				path: "xl/_rels/workbook.xml.rels",
				text: XlsxExportFormat.relationships([
					["worksheet", "worksheets/sheet1.xml"],
					["styles", "styles.xml"],
				]),
			},
			{ path: "xl/styles.xml", text: XlsxExportFormat.styles() },
			{ path: "xl/worksheets/sheet1.xml", text: XlsxExportFormat.worksheet(table) },
		]);
	}

	private static contentTypes(): string {
		const override = (part: string, type: string) =>
			`<Override PartName="/xl/${part}" ContentType="${CONTENT}.${type}+xml"/>`;
		return [
			DECLARATION,
			`<Types xmlns="${PACKAGE}/content-types">`,
			'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
			'<Default Extension="xml" ContentType="application/xml"/>',
			override("workbook.xml", "sheet.main"),
			override("worksheets/sheet1.xml", "worksheet"),
			override("styles.xml", "styles"),
			"</Types>",
		].join("");
	}

	private static relationships(targets: readonly (readonly [string, string])[]): string {
		const entries = targets.map(
			([type, target], index) =>
				`<Relationship Id="rId${index + 1}" Type="${RELATIONS}/${type}" Target="${target}"/>`,
		);
		return `${DECLARATION}<Relationships xmlns="${PACKAGE}/relationships">${entries.join("")}</Relationships>`;
	}

	private static workbook(sheet: string): string {
		return [
			DECLARATION,
			`<workbook xmlns="${MAIN}" xmlns:r="${RELATIONS}"><sheets>`,
			`<sheet name="${XlsxExportFormat.escape(sheet)}" sheetId="1" r:id="rId1"/>`,
			"</sheets></workbook>",
		].join("");
	}

	private static styles(): string {
		return [
			DECLARATION,
			`<styleSheet xmlns="${MAIN}">`,
			'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>',
			'<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>',
			'<fills count="2"><fill><patternFill patternType="none"/></fill>',
			'<fill><patternFill patternType="gray125"/></fill></fills>',
			'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
			'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
			'<cellXfs count="2">',
			'<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1">',
			'<alignment vertical="top" wrapText="1"/></xf>',
			'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>',
			"</cellXfs>",
			'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
			"</styleSheet>",
		].join("");
	}

	private static worksheet(table: ExportTable): string {
		const columns = table.widths.map(
			(width, index) =>
				`<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`,
		);
		const rows = [table.header, ...table.rows].map((row, index) => {
			const style = index === 0 ? 1 : 0;
			const cells = row.map(
				(value, column) =>
					`<c r="${XlsxExportFormat.column(column)}${index + 1}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${XlsxExportFormat.escape(value.slice(0, CELL_LIMIT))}</t></is></c>`,
			);
			return `<row r="${index + 1}">${cells.join("")}</row>`;
		});
		return [
			DECLARATION,
			`<worksheet xmlns="${MAIN}">`,
			'<sheetViews><sheetView workbookViewId="0">',
			'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>',
			"</sheetView></sheetViews>",
			`<cols>${columns.join("")}</cols>`,
			`<sheetData>${rows.join("")}</sheetData>`,
			"</worksheet>",
		].join("");
	}

	private static column(index: number): string {
		return String.fromCharCode("A".charCodeAt(0) + index);
	}

	private static escape(text: string): string {
		return text
			.replace(ILLEGAL, "")
			.replace(/_(?=x[0-9A-Fa-f]{4}_)/g, "_x005F_")
			.replace(/[&<>"\r]/g, (character) => ESCAPES[character]!);
	}
}
