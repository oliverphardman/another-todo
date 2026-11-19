import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import express, { type Express, type RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import spec from "../openapi.json";
import { ListService } from "./application/list-service";
import { SystemClock, UuidGenerator } from "./application/ports";
import { TaskService } from "./application/task-service";
import { BearerAuthenticator, type Authenticator } from "./http/authenticator";
import { CorsPolicy } from "./http/cors-policy";
import { DiscoveryController } from "./http/discovery-controller";
import { ErrorHandler } from "./http/error-handler";
import { ListController } from "./http/list-controller";
import { RouteSupport } from "./http/route-support";
import { TaskController } from "./http/task-controller";
import { CognitoTokenVerifier } from "./infrastructure/cognito-token-verifier";
import { DynamoTaskRepository } from "./infrastructure/dynamo-task-repository";
import { DynamoTodoListRepository } from "./infrastructure/dynamo-todo-list-repository";
import { McpController } from "./mcp/mcp-controller";
import { McpServer } from "./mcp/mcp-server";
import { createTools } from "./mcp/tools";

export interface ApiConfig {
	readonly tableName: string;
	readonly listsTableName: string;
	readonly userPoolId: string;
	readonly clientId: string;
	readonly publicUrl: string;
	readonly corsOrigins: readonly string[];
}

export interface Services {
	readonly tasks: TaskService;
	readonly lists: ListService;
}

export function readConfig(env: Record<string, string | undefined>): ApiConfig {
	const {
		TABLE_NAME: tableName,
		LISTS_TABLE_NAME: listsTableName,
		COGNITO_USER_POOL_ID: userPoolId,
		COGNITO_CLIENT_ID: clientId,
		PUBLIC_API_URL: publicUrl,
		CORS_ORIGINS: origins = "",
	} = env;
	if (!tableName || !listsTableName || !userPoolId || !clientId || !publicUrl) {
		throw new Error(
			"TABLE_NAME, LISTS_TABLE_NAME, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID and PUBLIC_API_URL must be set",
		);
	}
	const corsOrigins = origins
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);
	return { tableName, listsTableName, userPoolId, clientId, publicUrl, corsOrigins };
}

export function createApp(
	config: ApiConfig,
	services: Services,
	authenticator: Authenticator,
	issuer: string,
): Express {
	const app = express();
	app.disable("x-powered-by");
	app.use(new CorsPolicy(config.corsOrigins).middleware());
	app.use(new DiscoveryController(issuer, config.publicUrl).router());
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

export function createServices(config: ApiConfig, client: DynamoDBDocumentClient): Services {
	const tasks = new DynamoTaskRepository(client, config.tableName);
	const lists = new DynamoTodoListRepository(client, config.listsTableName);
	const ids = new UuidGenerator();
	const clock = new SystemClock();
	return {
		tasks: new TaskService(tasks, lists, ids, clock),
		lists: new ListService(lists, tasks, ids, clock),
	};
}

export function createApplication(config: ApiConfig, client: DynamoDBDocumentClient): Express {
	const verifier = new CognitoTokenVerifier(config.userPoolId, config.clientId);
	return createApp(
		config,
		createServices(config, client),
		new BearerAuthenticator(verifier),
		verifier.issuer,
	);
}
