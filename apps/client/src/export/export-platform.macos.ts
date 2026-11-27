import { NativeModules } from "react-native";
import type { ExportPlatform } from "./exporter";
import { HtmlPdfRenderer, type HtmlToPdf } from "./html-pdf-renderer";
import { ModuleFileSaver, type SaveModule } from "./module-file-saver";

type MacExportModule = SaveModule & { readonly renderPdf: HtmlToPdf };

export function createExportPlatform(): ExportPlatform {
	const module = NativeModules.AnotherToDoExport as MacExportModule | undefined;
	return {
		saver: new ModuleFileSaver(module),
		pdf: new HtmlPdfRenderer((html) => module!.renderPdf(html)),
	};
}
