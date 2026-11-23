import type { DataStore } from "../../application/data-store";
import { Attachment } from "../../domain/attachment";
import { Group } from "../../domain/group";
import { Photo } from "../../domain/photo";
import { Share } from "../../domain/share";
import { Task } from "../../domain/task";
import { TodoList } from "../../domain/todo-list";
import { ViewSettings } from "../../domain/view-settings";
import type { SqliteDatabase } from "./sqlite-database";
import { SqliteRepository } from "./sqlite-repository";

export class SqliteDataStore implements DataStore {
	readonly tasks;
	readonly lists;
	readonly groups;
	readonly shares;
	readonly photos;
	readonly attachments;
	readonly settings;

	constructor(database: SqliteDatabase) {
		const { connection } = database;
		this.tasks = new SqliteRepository(connection, "tasks", {
			toRecord: (task: Task) => task.toRecord(),
			restore: Task.restore,
		});
		this.lists = new SqliteRepository(connection, "lists", {
			toRecord: (list: TodoList) => list.toRecord(),
			restore: TodoList.restore,
		});
		this.groups = new SqliteRepository(connection, "groups", {
			toRecord: (group: Group) => group.toRecord(),
			restore: Group.restore,
		});
		this.shares = new SqliteRepository(connection, "shares", {
			toRecord: (share: Share) => share.toRecord(),
			restore: Share.restore,
		});
		this.photos = new SqliteRepository(connection, "photos", {
			toRecord: (photo: Photo) => photo.toRecord(),
			restore: Photo.restore,
		});
		this.attachments = new SqliteRepository(connection, "attachments", {
			toRecord: (attachment: Attachment) => attachment.toRecord(),
			restore: Attachment.restore,
		});
		this.settings = new SqliteRepository(connection, "settings", {
			toRecord: (settings: ViewSettings) => settings.toRecord(),
			restore: ViewSettings.restore,
		});
	}
}
