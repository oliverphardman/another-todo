import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SystemClock, UuidGenerator } from "./application/ports";
import { TaskService } from "./application/task-service";
import { ApiRouter } from "./http/api-router";
import { DiscoveryHandler } from "./http/discovery-handler";
import { TaskHttpHandler } from "./http/task-http-handler";
import { DynamoTaskRepository } from "./infrastructure/dynamo-task-repository";
import { McpHandler } from "./mcp/mcp-handler";
import { createTools } from "./mcp/tools";

export interface ApiConfig {
	readonly tableName: string;
	readonly issuer: string;
}

export function readConfig(env: Record<string, string | undefined>): ApiConfig {
	const { TABLE_NAME: tableName, OAUTH_ISSUER: issuer } = env;
	if (!tableName || !issuer) {
		throw new Error("TABLE_NAME and OAUTH_ISSUER must be set");
	}
	return { tableName, issuer };
}

export function createApi(config: ApiConfig, client: DynamoDBDocumentClient): ApiRouter {
	const service = new TaskService(
		new DynamoTaskRepository(client, config.tableName),
		new UuidGenerator(),
		new SystemClock(),
	);
	return new ApiRouter([
		new DiscoveryHandler(config.issuer),
		new TaskHttpHandler(service),
		new McpHandler(createTools(service)),
	]);
}
