import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
	type DynamoDBDocumentClient,
} from "@aws-sdk/lib-dynamodb";

type Item = Record<string, unknown>;

export class FakeDocumentClient {
	readonly items = new Map<string, Item>();

	constructor(private readonly pageSize = 1000) {}

	private static key(table: unknown, ownerId: unknown, id: unknown): string {
		return `${String(table)}|${String(ownerId)}#${String(id)}`;
	}

	async send(command: unknown): Promise<Record<string, unknown>> {
		if (command instanceof PutCommand) {
			const item = command.input.Item as Item;
			this.items.set(FakeDocumentClient.key(command.input.TableName, item.ownerId, item.id), item);
			return {};
		}
		if (command instanceof GetCommand) {
			const key = command.input.Key as Item;
			return {
				Item: this.items.get(FakeDocumentClient.key(command.input.TableName, key.ownerId, key.id)),
			};
		}
		if (command instanceof DeleteCommand) {
			const key = command.input.Key as Item;
			this.items.delete(FakeDocumentClient.key(command.input.TableName, key.ownerId, key.id));
			return {};
		}
		if (command instanceof QueryCommand) {
			return this.query(command);
		}
		throw new Error("Unsupported command");
	}

	private query(command: QueryCommand): Record<string, unknown> {
		const ownerId = command.input.ExpressionAttributeValues?.[":ownerId"];
		const all = [...this.items.entries()]
			.filter(
				([key, item]) => key.startsWith(`${command.input.TableName}|`) && item.ownerId === ownerId,
			)
			.map(([, item]) => item);
		const start = Number(command.input.ExclusiveStartKey?.offset ?? 0);
		const page = all.slice(start, start + this.pageSize);
		const next = start + this.pageSize;
		return next < all.length
			? { Items: page, LastEvaluatedKey: { offset: next } }
			: { Items: page };
	}

	asClient(): DynamoDBDocumentClient {
		return this as unknown as DynamoDBDocumentClient;
	}
}

export class EmptyQueryClient {
	async send(): Promise<Record<string, unknown>> {
		return {};
	}

	asClient(): DynamoDBDocumentClient {
		return this as unknown as DynamoDBDocumentClient;
	}
}

export class FailingClient {
	async send(): Promise<never> {
		throw new Error("database offline");
	}

	asClient(): DynamoDBDocumentClient {
		return this as unknown as DynamoDBDocumentClient;
	}
}
