import express, { type Express, type RequestHandler, type Router } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types";
import spec from "../openapi.json";
import type { ChangeChannel } from "./application/change-channel";
import type { DataStore } from "./application/data-store";
import type { MediaStorage } from "./application/media-storage";
import { ChangeNotifier } from "./application/change-notifier";
import { GroupService } from "./application/group-service";
import { ListService } from "./application/list-service";
import { AttachmentService } from "./application/attachment-service";
import { PhotoService } from "./application/photo-service";
import { SystemClock, UuidGenerator } from "./application/ports";
import { SharedAccess } from "./application/shared-access";
import { ShareService } from "./application/share-service";
import type { UserDirectory } from "./application/user-directory";
import { TaskService } from "./application/task-service";
import { ViewSettingsService } from "./application/view-settings-service";
import { Settings } from "./composition/env";
import type { Env, Identity, Media, Platform, Realtime } from "./composition/platform";
import { ChangeBroadcast } from "./http/change-broadcast";
import { ConfigController } from "./http/config-controller";
import { CorsPolicy } from "./http/cors-policy";
import { DiscoveryController } from "./http/discovery-controller";
import { ErrorHandler } from "./http/error-handler";
import { GroupController } from "./http/group-controller";
import { ListController } from "./http/list-controller";
import { AttachmentController } from "./http/attachment-controller";
import { PhotoController } from "./http/photo-controller";
import { RouteSupport } from "./http/route-support";
import { SettingsController } from "./http/settings-controller";
import { ShareController } from "./http/share-controller";
import { TaskController } from "./http/task-controller";
import { McpController } from "./mcp/mcp-controller";
import { McpServer } from "./mcp/mcp-server";
import { createTools } from "./mcp/tools";

export interface ApiConfig {
	readonly publicUrl: string;
	readonly corsOrigins: readonly string[];
	readonly notice: string | null;
}

export interface Services {
	readonly tasks: TaskService;
	readonly lists: ListService;
	readonly settings: ViewSettingsService;
	readonly photos: PhotoService;
	readonly attachments: AttachmentService;
	readonly groups: GroupService;
	readonly shares: ShareService;
	readonly notifier: ChangeNotifier;
}

export function readConfig(env: Env, fallbackUrl?: string): ApiConfig {
	const settings = new Settings(env);
	const publicUrl = settings.optional("PUBLIC_API_URL") ?? fallbackUrl;
	if (publicUrl === undefined) {
		throw new Error("PUBLIC_API_URL must be set");
	}
	return {
		publicUrl,
		corsOrigins: settings.list("CORS_ORIGINS"),
		notice: settings.optional("SERVER_NOTICE"),
	};
}

export function createApp(
	config: ApiConfig,
	services: Services,
	platform: {
		readonly identity: Identity;
		readonly media: Pick<Media, "router">;
		readonly realtime: Pick<Realtime, "endpoint">;
	},
	web: Router | null = null,
): Express {
	const { identity, media, realtime } = platform;
	const app = express();
	app.disable("x-powered-by");
	app.use(new CorsPolicy(config.corsOrigins).middleware());
	app.use(new DiscoveryController(identity.issuer ?? config.publicUrl, config.publicUrl).router());
	app.use(
		new ConfigController({
			authentication: identity.mode,
			providers: identity.providers,
			notice: config.notice,
			realtimeUrl: realtime.endpoint,
			signIn: identity.signIn,
		}).router(),
	);
	if (identity.router !== null) {
		app.use(identity.router);
	}
	if (media.router !== null) {
		app.use(media.router);
	}
	if (web !== null) {
		app.use(web);
	}
	app.use(
		["/tasks", "/lists", "/groups", "/view-settings", "/photos", "/mcp"],
		RouteSupport.authenticate(identity.authenticator),
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
	app.use("/tasks", new AttachmentController(services.attachments).router());
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
	data: DataStore,
	storage: MediaStorage,
	channel: ChangeChannel,
	directory: UserDirectory,
): Services {
	const access = new SharedAccess(data.shares);
	const ids = new UuidGenerator();
	const clock = new SystemClock();
	const attachments = new AttachmentService(data.attachments, data.tasks, storage, ids, clock);
	return {
		tasks: new TaskService(data.tasks, data.lists, access, ids, clock, attachments),
		lists: new ListService(
			data.lists,
			data.tasks,
			data.settings,
			data.groups,
			access,
			ids,
			clock,
			attachments,
		),
		attachments,
		shares: new ShareService(data.shares, data.lists, access, directory, clock),
		groups: new GroupService(data.groups, data.lists, ids, clock),
		settings: new ViewSettingsService(data.settings, data.photos, clock),
		photos: new PhotoService(data.photos, data.settings, storage, ids, clock),
		notifier: new ChangeNotifier(channel, access),
	};
}

export function createApplication(
	config: ApiConfig,
	platform: Platform,
	web: Router | null = null,
): Express {
	return createApp(
		config,
		createServices(
			platform.data,
			platform.media.storage,
			platform.realtime.channel,
			platform.identity.directory,
		),
		platform,
		web,
	);
}
