import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "vitest";
import type { DataStore } from "../src/application/data-store";
import { Group } from "../src/domain/group";
import { Photo } from "../src/domain/photo";
import { Share } from "../src/domain/share";
import { Task } from "../src/domain/task";
import { TodoList } from "../src/domain/todo-list";
import { ViewSettings } from "../src/domain/view-settings";
import { DynamoDataStore } from "../src/infrastructure/aws/dynamo-data-store";
import { InMemoryDataStore } from "../src/infrastructure/memory/in-memory-data-store";
import { SqliteDataStore } from "../src/infrastructure/local/sqlite-data-store";
import { SqliteDatabase } from "../src/infrastructure/local/sqlite-database";
import { FakeDocumentClient } from "./support/fake-document-client";
import { describeRepositoryContract } from "./support/repository-contract";
import { TEST_TABLES } from "./support/test-api";

const NOW = new Date("2026-01-01T00:00:00Z");

const directories: string[] = [];

afterAll(() => {
	for (const directory of directories) {
		SqliteDatabase.close(directory);
	}
});

const stores: Record<string, () => DataStore> = {
	"in-memory": () => new InMemoryDataStore(),
	DynamoDB: () => new DynamoDataStore(new FakeDocumentClient(2).asClient(), TEST_TABLES),
	SQLite: () => {
		const directory = mkdtempSync(join(tmpdir(), "atd-contract-"));
		directories.push(directory);
		return new SqliteDataStore(SqliteDatabase.in(directory));
	},
};

for (const [provider, create] of Object.entries(stores)) {
	describeRepositoryContract(
		`${provider} tasks`,
		() => create().tasks,
		(owner, id) => Task.create(owner, id, `Task ${id}`, NOW).setDueDate(NOW),
	);
	describeRepositoryContract(
		`${provider} lists`,
		() => create().lists,
		(owner, id) => TodoList.create(owner, id, `List ${id}`, NOW),
	);
	describeRepositoryContract(
		`${provider} groups`,
		() => create().groups,
		(owner, id) => Group.create(owner, id, `Group ${id}`, NOW),
	);
	describeRepositoryContract(
		`${provider} shares`,
		() => create().shares,
		(owner, id) => Share.grant(owner, `list-${id}`, id, `${id}@example.com`, NOW),
	);
	describeRepositoryContract(
		`${provider} photos`,
		() => create().photos,
		(owner, id) =>
			Photo.create(owner, id, { name: "a.png", contentType: "image/png", size: 5 }, NOW),
	);
	describeRepositoryContract(
		`${provider} settings`,
		() => create().settings,
		(owner, id) =>
			ViewSettings.create(
				owner,
				id,
				{ sort: null, sortDescending: false, hideCompleted: true, theme: null },
				NOW,
			),
	);
}
