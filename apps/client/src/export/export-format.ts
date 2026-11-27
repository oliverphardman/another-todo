import type { MessageKey } from "../i18n/en-us";
import type { I18n } from "../i18n/i18n";
import type { ExportDocument } from "./export-document";

export type ExportFormatId = "csv" | "xlsx" | "json" | "pdf";

export abstract class ExportFormat {
	abstract readonly id: ExportFormatId;
	abstract readonly labelKey: MessageKey;
	abstract readonly contentType: string;

	get extension(): string {
		return this.id;
	}

	abstract encode(document: ExportDocument, i18n: I18n): Promise<Uint8Array>;
}
