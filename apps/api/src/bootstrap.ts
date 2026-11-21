import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import express, { type Express, type RequestHandler } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import spec from "../openapi.json";
import { ChangeNotifier, type ConnectionPusher } from "./application/change-notifier";
import { ChangeBroadcast } from "./http/change-broadcast";
import { ApiGatewayPusher } from "./infrastructure/aws/api-gateway-pusher";
import { DynamoConnectionRepository } from "./infrastructure/aws/dynamo-connection-repository";
import { SharedAccess } from "./application/shared-access";
import { ShareService } from "./application/share-service";
import type { UserDirectory } from "./application/user-directory";
import { ShareController } from "./http/share-controller";
import { CognitoUserDirectory } from "./infrastructure/aws/cognito-user-directory";
import { DynamoShareRepository } from "./infrastructure/aws/dynamo-share-repository";
import { GroupService } from "./application/group-service";
import { GroupController } from "./http/group-controller";
import { DynamoGroupRepository } from "./infrastructure/aws/dynamo-group-repository";
import { ListService } from "./application/list-service";
import { PhotoService } from "./application/photo-service";
import type { MediaStorage } from "./application/media-storage";
import { SystemClock, UuidGenerator } from "./application/ports";
import { TaskService } from "./application/task-service";
import { ViewSettingsService } from "./application/view-settings-service";
import { BearerAuthenticator, type Authenticator } from "./http/authenticator";
import { CorsPolicy } from "./http/cors-policy";
import { DiscoveryController } from "./http/discovery-controller";
import { ErrorHandler } from "./http/error-handler";
import { ListController } from "./http/list-controller";
import { RouteSupport } from "./http/route-support";
import { TaskController } from "./http/task-controller";
import { CognitoTokenVerifier } from "./infrastructure/aws/cognito-token-verifier";
import { S3Client } from "@aws-sdk/client-s3";
import { DynamoPhotoRepository } from "./infrastructure/aws/dynamo-photo-repository";
import { DynamoViewSettingsRepository } from "./infrastructure/aws/dynamo-view-settings-repository";
import { S3MediaStorage } from "./infrastructure/aws/s3-media-storage";
import { PhotoController } from "./http/photo-controller";
import { SettingsController } from "./http/settings-controller";
import { DynamoTaskRepository } from "./infrastructure/aws/dynamo-task-repository";
import { DynamoTodoListRepository } from "./infrastructure/aws/dynamo-todo-list-repository";
import { McpController } from "./mcp/mcp-controller";
import { McpServer } from "./mcp/mcp-server";
import { createTools } from "./mcp/tools";

export interface ApiConfig {
	readonly tableName: string;
	readonly listsTableName: string;
	readonly settingsTableName: string;
	readonly photosTableName: string;
	readonly groupsTableName: string;
	readonly sharesTableName: string;
	readonly photosBucket: string;
	readonly connectionsTableName: string;
	readonly websocketManagementUrl: string;
	readonly userPoolId: string;
	readonly clientId: string;
	readonly publicUrl: string;
	readonly corsOrigins: readonly string[];
}

export interface Services {
	readonly tasks: TaskService;
	readonly lists: ListService;
	readonly settings: ViewSettingsService;
	readonly photos: PhotoService;
	readonly groups: GroupService;
	readonly shares: ShareService;
	readonly notifier: ChangeNotifier;
}

export function readConfig(env: Record<string, string | undefined>): ApiConfig {
	const {
		TABLE_NAME: tableName,
		LISTS_TABLE_NAME: listsTableName,
		SETTINGS_TABLE_NAME: settingsTableName,
		PHOTOS_TABLE_NAME: photosTableName,
		GROUPS_TABLE_NAME: groupsTableName,
		SHARES_TABLE_NAME: sharesTableName,
		PHOTOS_BUCKET: photosBucket,
		CONNECTIONS_TABLE_NAME: connectionsTableName,
		WEBSOCKET_MANAGEMENT_URL: websocketManagementUrl,
		COGNITO_USER_POOL_ID: userPoolId,
		COGNITO_CLIENT_ID: clientId,
		PUBLIC_API_URL: publicUrl,
		CORS_ORIGINS: origins = "",
	} = env;
	if (
		!tableName ||
		!listsTableName ||
		!settingsTableName ||
		!photosTableName ||
		!groupsTableName ||
		!sharesTableName ||
		!photosBucket ||
		!connectionsTableName ||
		!websocketManagementUrl ||
		!userPoolId ||
		!clientId ||
		!publicUrl
	) {
		throw new Error(
			"TABLE_NAME, LISTS_TABLE_NAME, SETTINGS_TABLE_NAME, PHOTOS_TABLE_NAME, GROUPS_TABLE_NAME, SHARES_TABLE_NAME, PHOTOS_BUCKET, CONNECTIONS_TABLE_NAME, WEBSOCKET_MANAGEMENT_URL, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID and PUBLIC_API_URL must be set",
		);
	}
	const corsOrigins = origins
		.split(",")
		.map((origin) => origin.trim())
		.filter((origin) => origin.length > 0);
	return {
		tableName,
		listsTableName,
		settingsTableName,
		photosTableName,
		groupsTableName,
		sharesTableName,
		photosBucket,
		connectionsTableName,
		websocketManagementUrl,
		userPoolId,
		clientId,
		publicUrl,
		corsOrigins,
	};
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
	app.use(
		["/tasks", "/lists", "/groups", "/view-settings", "/photos", "/mcp"],
		RouteSupport.authenticate(authenticator),
	);
	app.use(
		["/tasks", "/lists", "/view-settings", "/photos", "/mcp"],
		new ChangeBroadcast(services.notifier).middleware(),
	);
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
	app.use("/lists", new ShareController(services.shares).router());
	app.use("/lists", new ListController(services.lists, services.shares).router());
	app.use("/groups", new GroupController(services.groups).router());
	app.use("/view-settings", new SettingsController(services.settings).router());
	app.use("/photos", new PhotoController(services.photos).router());
	app.use(new ErrorHandler().middleware());
	return app;
}

export function createServices(
	config: ApiConfig,
	client: DynamoDBDocumentClient,
	storage: MediaStorage,
	pusher: ConnectionPusher,
	directory: UserDirectory,
): Services {
	const tasks = new DynamoTaskRepository(client, config.tableName);
	const lists = new DynamoTodoListRepository(client, config.listsTableName);
	const settings = new DynamoViewSettingsRepository(client, config.settingsTableName);
	const photos = new DynamoPhotoRepository(client, config.photosTableName);
	const groups = new DynamoGroupRepository(client, config.groupsTableName);
	const shareRepository = new DynamoShareRepository(client, config.sharesTableName);
	const access = new SharedAccess(shareRepository);
	const connections = new DynamoConnectionRepository(client, config.connectionsTableName);
	const ids = new UuidGenerator();
	const clock = new SystemClock();
	return {
		tasks: new TaskService(tasks, lists, access, ids, clock),
		lists: new ListService(lists, tasks, settings, groups, access, ids, clock),
		shares: new ShareService(shareRepository, lists, access, directory, clock),
		groups: new GroupService(groups, lists, ids, clock),
		settings: new ViewSettingsService(settings, photos, clock),
		photos: new PhotoService(photos, settings, storage, ids, clock),
		notifier: new ChangeNotifier(connections, pusher, access),
	};
}

export function createApplication(config: ApiConfig, client: DynamoDBDocumentClient): Express {
	const verifier = new CognitoTokenVerifier(config.userPoolId, config.clientId);
	return createApp(
		config,
		createServices(
			config,
			client,
			new S3MediaStorage(new S3Client({}), config.photosBucket),
			ApiGatewayPusher.forEndpoint(config.websocketManagementUrl),
			CognitoUserDirectory.forPool(config.userPoolId),
		),
		new BearerAuthenticator(verifier),
		verifier.issuer,
	);
}
