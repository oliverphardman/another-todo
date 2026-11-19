import { CreateTableCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { beforeAll, describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { DynamoTaskRepository } from "../src/infrastructure/dynamo-task-repository";
import { event, rpcEvent } from "../test/support/events";
import { createTestApi } from "../test/support/test-api";

const rawClient = (): DynamoDBClient =>
	new DynamoDBClient({
		endpoint: process.env.DYNAMODB_ENDPOINT,
		region: "eu-west-2",
		credentials: { accessKeyId: "local", secretAccessKey: "local" },
	});

const documentClient = DynamoDBDocumentClient.from(rawClient(), {
	marshallOptions: { removeUndefinedValues: true },
});

async function createTable(name: string): Promise<void> {
	await rawClient().send(
		new CreateTableCommand({
			TableName: name,
			BillingMode: "PAY_PER_REQUEST",
			AttributeDefinitions: [
				{ AttributeName: "ownerId", AttributeType: "S" },
				{ AttributeName: "id", AttributeType: "S" },
			],
			KeySchema: [
				{ AttributeName: "ownerId", KeyType: "HASH" },
				{ AttributeName: "id", KeyType: "RANGE" },
			],
		}),
	);
}

describe("API against DynamoDB Local", () => {
	const api = createTestApi({ asClient: () => documentClient });

	beforeAll(async () => {
		await createTable("tasks");
		await createTable("lists");
		await createTable("settings");
		await createTable("photos");
	});

	it("runs the full task and list lifecycle", async () => {
		const list = await api(event({ method: "POST", path: "/lists", body: { name: "Work" } }));
		expect(list.status).toBe(201);
		const task = await api(
			event({ method: "POST", path: "/tasks", body: { title: "Ship", listId: list.body.id } }),
		);
		expect(task.status).toBe(201);
		const patched = await api(
			event({
				method: "PATCH",
				path: `/tasks/${task.body.id}`,
				body: { completed: true, dueDate: "2026-03-01T00:00:00Z" },
			}),
		);
		expect(patched.body).toMatchObject({ completed: true, dueDate: "2026-03-01T00:00:00.000Z" });
		const filtered = await api(event({ path: `/tasks?listId=${list.body.id}` }));
		expect(filtered.body.tasks).toHaveLength(1);
		const cleared = await api(
			event({
				method: "PATCH",
				path: `/tasks/${task.body.id}`,
				body: { dueDate: null, listId: null },
			}),
		);
		expect(cleared.body).toMatchObject({ dueDate: null, listId: null });
		await api(
			event({ method: "PATCH", path: `/tasks/${task.body.id}`, body: { listId: list.body.id } }),
		);
		expect((await api(event({ method: "DELETE", path: `/lists/${list.body.id}` }))).status).toBe(
			204,
		);
		expect((await api(event({ path: `/tasks/${task.body.id}` }))).status).toBe(404);
	});

	it("isolates users and serves MCP from the same tables", async () => {
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "Mine" }, sub: "alice" }),
		);
		expect((await api(event({ path: `/tasks/${created.body.id}`, sub: "bob" }))).status).toBe(404);
		const viaMcp = await api(
			rpcEvent("tools/call", { name: "list_tasks", arguments: {} }, 1, "alice"),
		);
		expect(JSON.parse(viaMcp.body.result.content[0].text)).toHaveLength(1);
	});

	it("stores view settings and photo records, and clears a deleted photo's theme", async () => {
		const created = await api(
			event({
				method: "POST",
				path: "/photos",
				body: { name: "Hills", contentType: "image/webp", size: 4096 },
				sub: "scenery",
			}),
		);
		expect(created.status).toBe(201);
		const photoId = created.body.photo.id;
		const themed = await api(
			event({
				method: "PUT",
				path: "/view-settings/my-day",
				body: { sort: "due", hideCompleted: true, theme: { type: "photo", photoId } },
				sub: "scenery",
			}),
		);
		expect(themed.body.theme).toEqual({ type: "photo", photoId });
		expect((await api(event({ path: "/photos", sub: "scenery" }))).body.photos).toHaveLength(1);
		await api(event({ method: "DELETE", path: `/photos/${photoId}`, sub: "scenery" }));
		const settings = await api(event({ path: "/view-settings", sub: "scenery" }));
		expect(settings.body.settings[0]).toMatchObject({
			sort: "due",
			hideCompleted: true,
			theme: null,
		});
		expect((await api(event({ path: "/photos", sub: "scenery" }))).body.photos).toEqual([]);
	});

	it("pages through results larger than one query page", async () => {
		const big = "x".repeat(300_000);
		const repo = new DynamoTaskRepository(documentClient, "tasks");
		for (let i = 0; i < 5; i += 1) {
			await repo.save(Task.create("pager", `t${i}`, big, new Date("2026-01-01T00:00:00Z")));
		}
		expect(await repo.list("pager")).toHaveLength(5);
	});

	it("restores records written before lists existed", async () => {
		await documentClient.send(
			new PutCommand({
				TableName: "tasks",
				Item: {
					ownerId: "legacy",
					id: "old",
					title: "Old",
					completed: false,
					importance: "normal",
					dueDate: null,
					createdAt: "2025-01-01T00:00:00.000Z",
				},
			}),
		);
		const reply = await api(event({ path: "/tasks/old", sub: "legacy" }));
		expect(reply.body.listId).toBeNull();
	});
});
