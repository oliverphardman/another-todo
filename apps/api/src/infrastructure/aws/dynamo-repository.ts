import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
	type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

export abstract class DynamoRepository<E extends { ownerId: string; id: string }, R> {
	constructor(
		private readonly client: DynamoDBDocumentClient,
		private readonly tableName: string,
	) {}

	protected abstract toRecord(entity: E): R;

	protected abstract restore(record: R): E;

	async save(entity: E): Promise<void> {
		await this.client.send(
			new PutCommand({ TableName: this.tableName, Item: this.toRecord(entity) as never }),
		);
	}

	async findById(ownerId: string, id: string): Promise<E | null> {
		const result = await this.client.send(
			new GetCommand({ TableName: this.tableName, Key: { ownerId, id }, ConsistentRead: true }),
		);
		return result.Item === undefined ? null : this.restore(result.Item as R);
	}

	async list(ownerId: string): Promise<E[]> {
		const entities: E[] = [];
		let startKey: Record<string, unknown> | undefined;
		do {
			const page = await this.client.send(
				new QueryCommand({
					TableName: this.tableName,
					KeyConditionExpression: "ownerId = :ownerId",
					ExpressionAttributeValues: { ":ownerId": ownerId },
					ExclusiveStartKey: startKey,
					ConsistentRead: true,
				}),
			);
			entities.push(...(page.Items ?? []).map((item) => this.restore(item as R)));
			startKey = page.LastEvaluatedKey;
		} while (startKey !== undefined);
		return entities;
	}

	async delete(ownerId: string, id: string): Promise<void> {
		await this.client.send(new DeleteCommand({ TableName: this.tableName, Key: { ownerId, id } }));
	}
}
