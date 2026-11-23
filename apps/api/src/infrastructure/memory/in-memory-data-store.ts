import type { DataStore } from "../../application/data-store";
import { InMemoryGroupRepository } from "./in-memory-group-repository";
import { InMemoryAttachmentRepository } from "./in-memory-attachment-repository";
import { InMemoryPhotoRepository } from "./in-memory-photo-repository";
import { InMemoryShareRepository } from "./in-memory-share-repository";
import { InMemoryTaskRepository } from "./in-memory-task-repository";
import { InMemoryTodoListRepository } from "./in-memory-todo-list-repository";
import { InMemoryViewSettingsRepository } from "./in-memory-view-settings-repository";

export class InMemoryDataStore implements DataStore {
	readonly tasks = new InMemoryTaskRepository();
	readonly lists = new InMemoryTodoListRepository();
	readonly groups = new InMemoryGroupRepository();
	readonly shares = new InMemoryShareRepository();
	readonly photos = new InMemoryPhotoRepository();
	readonly attachments = new InMemoryAttachmentRepository();
	readonly settings = new InMemoryViewSettingsRepository();
}
