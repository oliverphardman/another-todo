import { NativeModules } from "react-native";
import type { ExportPlatform } from "./exporter";
import { ModuleFileSaver, type SaveModule } from "./module-file-saver";

export function createExportPlatform(): ExportPlatform {
	return {
		saver: new ModuleFileSaver(NativeModules.AnotherToDoExport as SaveModule | undefined),
		pdf: null,
	};
}
