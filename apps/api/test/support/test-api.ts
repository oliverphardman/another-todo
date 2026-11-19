import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import type { Context } from "aws-lambda";
import { createHandler } from "../../src/bootstrap";
import { FakeDocumentClient } from "./fake-document-client";

export interface ApiReply {
	readonly status: number;
	readonly body: any;
	readonly raw: string;
}

export function createTestApi(
	client: { asClient(): DynamoDBDocumentClient } = new FakeDocumentClient(2),
) {
	const handler = createHandler(
		{ tableName: "tasks", issuer: "https://issuer.example.com" },
		client.asClient(),
	);
	return async (input: Record<string, unknown>): Promise<ApiReply> => {
		const result = (await handler(input, {} as Context, () => undefined)) as {
			statusCode: number;
			body?: string;
		};
		const raw = result.body ?? "";
		return { status: result.statusCode, raw, body: raw === "" ? undefined : JSON.parse(raw) };
	};
}
