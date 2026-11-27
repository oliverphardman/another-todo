import { requireOptionalNativeModule } from "expo";
import * as Print from "expo-print";
import type { ExportPlatform } from "./exporter";
import { HtmlPdfRenderer } from "./html-pdf-renderer";
import { ModuleFileSaver, type SaveModule } from "./module-file-saver";

export function createExportPlatform(): ExportPlatform {
	return {
		saver: new ModuleFileSaver(requireOptionalNativeModule<SaveModule>("AnotherToDoExport")),
		pdf: new HtmlPdfRenderer(async (html) => {
			const { base64 } = await Print.printToFileAsync({ html, base64: true });
			return base64!;
		}),
	};
}
