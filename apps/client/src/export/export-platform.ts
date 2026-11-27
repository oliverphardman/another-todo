import { BrowserFileSaver } from "./browser-file-saver";
import { CanvasPdfRenderer } from "./canvas-pdf-renderer";
import type { ExportPlatform } from "./exporter";

export function createExportPlatform(): ExportPlatform {
	return { saver: new BrowserFileSaver(), pdf: new CanvasPdfRenderer() };
}
