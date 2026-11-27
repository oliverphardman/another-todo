import type { TaskView } from "../domain/task-view";
import type { ExportDocument } from "./export-document";
import type { ExportDocumentBuilder } from "./export-document-builder";

export interface ExportSelection {
	document(builder: ExportDocumentBuilder): ExportDocument;
}

export class ViewSelection implements ExportSelection {
	constructor(private readonly view: TaskView) {}

	document(builder: ExportDocumentBuilder): ExportDocument {
		return builder.forView(this.view);
	}
}

export class ListsSelection implements ExportSelection {
	constructor(private readonly ids: ReadonlySet<string>) {}

	document(builder: ExportDocumentBuilder): ExportDocument {
		return builder.forLists(this.ids);
	}
}
