import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
	type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";
import { Task, type TaskRecord } from "../domain/task";
import type { TaskRepository } from "../domain/task-repository";

export class DynamoTaskRepository implements TaskRepository {
	constructor(
		private readonly client: DynamoDBDocumentClient,
		private readonly tableName: string,
	) {}

	async save(task: Task): Promise<void> {
		await this.client.send(new PutCommand({ TableName: this.tableName, Item: task.toRecord() }));
	}

	async findById(ownerId: string, id: string): Promise<Task | null> {
		const result = await this.client.send(
			new GetCommand({ TableName: this.tableName, Key: { ownerId, id } }),
		);
		return result.Item === undefined ? null : Task.restore(result.Item as TaskRecord);
	}

	async list(ownerId: string): Promise<Task[]> {
		const tasks: Task[] = [];
		let startKey: Record<string, unknown> | undefined;
		do {
			const page = await this.client.send(
				new QueryCommand({
					TableName: this.tableName,
					KeyConditionExpression: "ownerId = :ownerId",
					ExpressionAttributeValues: { ":ownerId": ownerId },
					ExclusiveStartKey: startKey,
				}),
			);
			tasks.push(...(page.Items ?? []).map((item) => Task.restore(item as TaskRecord)));
			startKey = page.LastEvaluatedKey;
		} while (startKey !== undefined);
		return tasks;
	}

	async delete(ownerId: string, id: string): Promise<void> {
		await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: { ownerId, id } }));
	}
}
