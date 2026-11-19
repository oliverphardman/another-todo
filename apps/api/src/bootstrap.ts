import serverlessExpress from "@codegenie/serverless-express";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import express, { type Express, type RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import spec from "../openapi.json";
import { SystemClock, UuidGenerator } from "./application/ports";
import { TaskService } from "./application/task-service";
import { ApiGatewayAuthenticator, type Authenticator } from "./http/authenticator";
import { DiscoveryController } from "./http/discovery-controller";
import { ErrorHandler } from "./http/error-handler";
import { RouteSupport } from "./http/route-support";
import { TaskController } from "./http/task-controller";
import { DynamoTaskRepository } from "./infrastructure/dynamo-task-repository";
import { McpController } from "./mcp/mcp-controller";
import { McpServer } from "./mcp/mcp-server";
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

export function createApp(
	config: ApiConfig,
	service: TaskService,
	authenticator: Authenticator,
): Express {
	const app = express();
	app.disable("x-powered-by");
	app.use(new DiscoveryController(config.issuer).router());
	app.use(["/tasks", "/mcp"], RouteSupport.authenticate(authenticator));
	app.use("/mcp", new McpController(new McpServer(createTools(service))).router());
	app.use(express.json());
	app.use(
		...(OpenApiValidator.middleware({
			apiSpec: spec as unknown as OpenAPIV3.DocumentV3,
			validateRequests: true,
			validateResponses: true,
			validateSecurity: false,
		}) as unknown as RequestHandler[]),
	);
	app.use("/tasks", new TaskController(service).router());
	app.use(new ErrorHandler().middleware());
	return app;
}

export function createHandler(config: ApiConfig, client: DynamoDBDocumentClient) {
	const service = new TaskService(
		new DynamoTaskRepository(client, config.tableName),
		new UuidGenerator(),
		new SystemClock(),
	);
	return serverlessExpress({ app: createApp(config, service, new ApiGatewayAuthenticator()) });
}
