import type { Clock } from "../domain/ports";
import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import { CsvExportFormat } from "./csv-export-format";
import { ExportDocumentBuilder, type ListChoiceGroup } from "./export-document-builder";
import { ExportFileName } from "./export-file-name";
import type { ExportFormat, ExportFormatId } from "./export-format";
import type { ExportSelection } from "./export-selection";
import type { FileSaver, SaveOutcome } from "./file-saver";
import { JsonExportFormat } from "./json-export-format";
import { PdfExportFormat } from "./pdf-export-format";
import type { PdfRenderer } from "./pdf-renderer";
import { XlsxExportFormat } from "./xlsx-export-format";

export interface ExportPlatform {
	readonly saver: FileSaver;
	readonly pdf: PdfRenderer | null;
}

export class Exporter {
	readonly formats: readonly ExportFormat[];

	constructor(
		private readonly platform: ExportPlatform,
		private readonly store: TodoStore,
		private readonly clock: Clock,
	) {
		this.formats = [
			new CsvExportFormat(),
			new XlsxExportFormat(),
			new JsonExportFormat(),
			...(platform.pdf === null ? [] : [new PdfExportFormat(platform.pdf)]),
		];
	}

	get available(): boolean {
		return this.platform.saver.available;
	}

	choices(i18n: I18n): ListChoiceGroup[] {
		return new ExportDocumentBuilder(this.store, this.clock, i18n).choices();
	}

	export(formatId: ExportFormatId, selection: ExportSelection, i18n: I18n): Promise<SaveOutcome> {
		const format = this.formats.find((candidate) => candidate.id === formatId)!;
		const document = selection.document(new ExportDocumentBuilder(this.store, this.clock, i18n));
		return this.platform.saver.save({
			name: ExportFileName.of(document.title, format.extension, i18n.t("app.name")),
			extension: format.extension,
			contentType: format.contentType,
			content: () => format.encode(document, i18n),
		});
	}
}
