import type { I18n } from "../i18n/i18n";
import { ListPrintDocument, type PrintableBook } from "../print/list-print-document";
import { Bytes } from "./bytes";
import type { PdfRenderer } from "./pdf-renderer";

export type HtmlToPdf = (html: string) => Promise<string>;

export class HtmlPdfRenderer implements PdfRenderer {
	constructor(private readonly convert: HtmlToPdf) {}

	async render(book: PrintableBook, i18n: I18n): Promise<Uint8Array> {
		return Bytes.fromBase64(await this.convert(ListPrintDocument.book(book, i18n)));
	}
}
