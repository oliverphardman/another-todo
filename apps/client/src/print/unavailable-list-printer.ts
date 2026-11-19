import type { ListPrinter } from "./list-print-document";

export class UnavailableListPrinter implements ListPrinter {
	async print(): Promise<void> {
		return;
	}
}
