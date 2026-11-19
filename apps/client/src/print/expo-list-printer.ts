import * as Print from "expo-print";
import type { ListPrinter } from "./list-print-document";

export class ExpoListPrinter implements ListPrinter {
	async print(html: string): Promise<void> {
		await Print.printAsync({ html });
	}
}
