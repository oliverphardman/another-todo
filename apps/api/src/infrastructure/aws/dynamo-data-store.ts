import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { DataStore } from "../../application/data-store";
import { DynamoAttachmentRepository } from "./dynamo-attachment-repository";
import { DynamoGroupRepository } from "./dynamo-group-repository";
import { DynamoPhotoRepository } from "./dynamo-photo-repository";
import { DynamoShareRepository } from "./dynamo-share-repository";
import { DynamoTaskRepository } from "./dynamo-task-repository";
import { DynamoTodoListRepository } from "./dynamo-todo-list-repository";
import { DynamoViewSettingsRepository } from "./dynamo-view-settings-repository";

export interface DynamoTables {
	readonly tasks: string;
	readonly lists: string;
	readonly settings: string;
	readonly photos: string;
	readonly attachments: string;
	readonly groups: string;
	readonly shares: string;
}

export class DynamoDataStore implements DataStore {
	readonly tasks;
	readonly lists;
	readonly groups;
	readonly shares;
	readonly photos;
	readonly attachments;
	readonly settings;

	constructor(client: DynamoDBDocumentClient, tables: DynamoTables) {
		this.tasks = new DynamoTaskRepository(client, tables.tasks);
		this.lists = new DynamoTodoListRepository(client, tables.lists);
		this.groups = new DynamoGroupRepository(client, tables.groups);
		this.shares = new DynamoShareRepository(client, tables.shares);
		this.photos = new DynamoPhotoRepository(client, tables.photos);
		this.attachments = new DynamoAttachmentRepository(client, tables.attachments);
		this.settings = new DynamoViewSettingsRepository(client, tables.settings);
	}
}
