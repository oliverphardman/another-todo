import serverlessExpress from "@codegenie/serverless-express";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import express, { type Express, type RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import spec from "../openapi.json";
import { SystemClock, UuidGenerator } from "./application/ports";
import { ListService } from "./application/list-service";
import { TaskService } from "./application/task-service";
import { ApiGatewayAuthenticator, type Authenticator } from "./http/authenticator";
import { DiscoveryController } from "./http/discovery-controller";
import { ErrorHandler } from "./http/error-handler";
import { RouteSupport } from "./http/route-support";
import { ListController } from "./http/list-controller";
import { TaskController } from "./http/task-controller";
import { DynamoTaskRepository } from "./infrastructure/dynamo-task-repository";
import { DynamoTodoListRepository } from "./infrastructure/dynamo-todo-list-repository";
import { McpController } from "./mcp/mcp-controller";
import { McpServer } from "./mcp/mcp-server";
import { createTools } from "./mcp/tools";

export interface ApiConfig {
	readonly tableName: string;
	readonly listsTableName: string;
	readonly issuer: string;
}

export function readConfig(env: Record<string, string | undefined>): ApiConfig {
	const { TABLE_NAME: tableName, LISTS_TABLE_NAME: listsTableName, OAUTH_ISSUER: issuer } = env;
	if (!tableName || !listsTableName || !issuer) {
		throw new Error("TABLE_NAME, LISTS_TABLE_NAME and OAUTH_ISSUER must be set");
	}
	return { tableName, listsTableName, issuer };
}

export interface Services {
	readonly tasks: TaskService;
	readonly lists: ListService;
}

export function createApp(
	config: ApiConfig,
	services: Services,
	authenticator: Authenticator,
): Express {
	const app = express();
	app.disable("x-powered-by");
	app.use(new DiscoveryController(config.issuer).router());
	app.use(["/tasks", "/lists", "/mcp"], RouteSupport.authenticate(authenticator));
	app.use(
		"/mcp",
		new McpController(new McpServer(createTools(services.tasks, services.lists))).router(),
	);
	app.use(express.json());
	app.use(
		...(OpenApiValidator.middleware({
			apiSpec: spec as unknown as OpenAPIV3.DocumentV3,
			validateRequests: true,
			validateResponses: true,
			validateSecurity: false,
		}) as unknown as RequestHandler[]),
	);
	app.use("/tasks", new TaskController(services.tasks).router());
	app.use("/lists", new ListController(services.lists).router());
	app.use(new ErrorHandler().middleware());
	return app;
}

export function createHandler(config: ApiConfig, client: DynamoDBDocumentClient) {
	const tasks = new DynamoTaskRepository(client, config.tableName);
	const lists = new DynamoTodoListRepository(client, config.listsTableName);
	const ids = new UuidGenerator();
	const clock = new SystemClock();
	const services = {
		tasks: new TaskService(tasks, lists, ids, clock),
		lists: new ListService(lists, tasks, ids, clock),
	};
	return serverlessExpress({ app: createApp(config, services, new ApiGatewayAuthenticator()) });
}
