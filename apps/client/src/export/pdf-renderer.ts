import type { I18n } from "../i18n/i18n";
import type { PrintableBook } from "../print/list-print-document";

export interface PdfRenderer {
	render(book: PrintableBook, i18n: I18n): Promise<Uint8Array>;
}
