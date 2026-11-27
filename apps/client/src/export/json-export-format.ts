import { Bytes } from "./bytes";
import type { ExportDocument, ExportedTask } from "./export-document";
import { ExportFormat } from "./export-format";

const SCHEMA_VERSION = 1;

export class JsonExportFormat extends ExportFormat {
	readonly id = "json";
	readonly labelKey = "export.json";
	readonly contentType = "application/json";

	async encode(document: ExportDocument): Promise<Uint8Array> {
		const content = {
			version: SCHEMA_VERSION,
			exportedAt: document.exportedAt,
			lists: document.lists.map((list) => ({
				name: list.name,
				group: list.group,
				tasks: list.tasks.map(JsonExportFormat.task),
			})),
		};
		return Bytes.utf8(`${JSON.stringify(content, null, 2)}\n`);
	}

	private static task({ task, list, group, inMyDay }: ExportedTask) {
		return {
			id: task.id,
			title: task.title,
			list,
			group,
			completed: task.completed,
			important: task.important,
			dueDate: task.dueDay,
			remindAt: task.remindAt,
			repeat: task.repeat,
			myDay: inMyDay,
			steps: task.steps.map((step) => ({ title: step.title, completed: step.completed })),
			note: task.note,
			createdAt: task.createdAt,
		};
	}
}
