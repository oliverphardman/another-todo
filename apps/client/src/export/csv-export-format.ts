import type { I18n } from "../i18n/i18n";
import { Bytes } from "./bytes";
import type { ExportDocument } from "./export-document";
import { ExportFormat } from "./export-format";
import { ExportTable } from "./export-table";

const BYTE_ORDER_MARK = "﻿";
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]|^ | $/;

export class CsvExportFormat extends ExportFormat {
	readonly id = "csv";
	readonly labelKey = "export.csv";
	readonly contentType = "text/csv";

	async encode(document: ExportDocument, i18n: I18n): Promise<Uint8Array> {
		const table = ExportTable.from(document, i18n);
		const lines = [table.header, ...table.rows].map((row) =>
			row.map(CsvExportFormat.cell).join(","),
		);
		return Bytes.utf8(`${BYTE_ORDER_MARK}${lines.join("\r\n")}\r\n`);
	}

	private static cell(value: string): string {
		const inert = FORMULA_START.test(value) ? `'${value}` : value;
		return NEEDS_QUOTES.test(inert) ? `"${inert.replaceAll('"', '""')}"` : inert;
	}
}
