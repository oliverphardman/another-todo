import type { I18n } from "../i18n/i18n";
import type { PrintableBook } from "../print/list-print-document";
import type { ExportDocument } from "./export-document";
import { ExportFormat } from "./export-format";
import type { PdfRenderer } from "./pdf-renderer";

export class PdfExportFormat extends ExportFormat {
	readonly id = "pdf";
	readonly labelKey = "export.pdf";
	readonly contentType = "application/pdf";

	constructor(private readonly renderer: PdfRenderer) {
		super();
	}

	encode(document: ExportDocument, i18n: I18n): Promise<Uint8Array> {
		return this.renderer.render(PdfExportFormat.book(document), i18n);
	}

	private static book(document: ExportDocument): PrintableBook {
		return {
			title: document.title,
			lists: document.lists.map((list) => {
				const tasks = list.tasks.map((entry) => entry.task);
				return {
					title: list.name,
					subtitle: list.subtitle,
					open: tasks.filter((task) => !task.completed),
					done: tasks.filter((task) => task.completed),
					today: document.today,
				};
			}),
		};
	}
}
