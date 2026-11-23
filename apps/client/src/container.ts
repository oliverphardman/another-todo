import { AuthorizedHttp, type Fetcher } from "./api/authorized-http";
import type { AttachmentGateway, FilePicker } from "./attachments/attachment-gateway";
import { ExpoFilePicker } from "./attachments/expo-file-picker";
import { HttpAttachmentGateway } from "./attachments/http-attachment-gateway";
import { TaskAttachments } from "./attachments/task-attachments";
import { ExpoPhotoPicker } from "./photos/expo-photo-picker";
import { HttpPhotoGateway } from "./photos/http-photo-gateway";
import { HttpShareGateway } from "./shares/http-share-gateway";
import type { ShareGateway } from "./shares/share-gateway";
import { ExpoMicrosoftAuthorizer } from "./microsoft/expo-microsoft-authorizer";
import { GraphTodoGateway, type GraphFetcher } from "./microsoft/graph-todo-gateway";
import type { MicrosoftAuthorizer } from "./microsoft/microsoft-authorizer";
import { LinkRepository } from "./microsoft/microsoft-links";
import { MicrosoftSession } from "./microsoft/microsoft-session";
import { MicrosoftSyncEngine } from "./microsoft/microsoft-sync-engine";
import { MicrosoftSyncService } from "./microsoft/microsoft-sync-service";
import { PhotoLibrary } from "./photos/photo-library";
import type { PhotoGateway, PhotoPicker } from "./photos/photo-gateway";
import { ExpoListPrinter } from "./print/expo-list-printer";
import type { ListPrinter } from "./print/list-print-document";
import { createReminderNotifier } from "./reminders/reminder-notifier-factory";
import type { ReminderNotifier } from "./reminders/reminder-notifier";
import { ReminderService } from "./reminders/reminder-service";
import { ExpoSoundPlayer } from "./audio/expo-sound-player";
import type { SoundPlayer } from "./audio/sound-player";
import { HttpApiGateway } from "./api/http-api-gateway";
import { AuthenticationService } from "./auth/authentication-service";
import type { AuthorizationServer } from "./auth/authorization-server";
import type { BrowserSession } from "./auth/browser-session";
import { ExpoBrowserSession } from "./auth/expo-browser-session";
import { NoAuthorizationServer } from "./auth/no-authorization-server";
import { PasswordAuthorizationServer } from "./auth/password-authorization-server";
import { ExpoAuthorizationServer } from "./auth/expo-authorization-server";
import { TokenRepository } from "./auth/token-repository";
import type { AppConfig } from "./config/app-config";
import type { ServerControls } from "./config/server-session";
import { RandomIdGenerator, SystemClock, type Clock, type IdGenerator } from "./domain/ports";
import { NetInfoConnectivity, type Connectivity } from "./state/connectivity";
import { PaneWidths } from "./state/pane-widths";
import { STANDARD_MOTION, type Motion } from "./ui/motion";
import { TodoStore } from "./state/todo-store";
import { AsyncStorageKeyValueStore } from "./storage/async-storage-key-value-store";
import type { KeyValueStore } from "./storage/key-value-store";
import { LocalDatabase } from "./storage/local-database";
import { createTokenStore } from "./storage/token-store";
import { RealtimeClient, type SocketFactory, type SocketLike } from "./sync/realtime-client";
import { SyncCoordinator } from "./sync/sync-coordinator";
import { SyncEngine } from "./sync/sync-engine";

export interface Container {
	readonly config: AppConfig;
	readonly server: ServerControls;
	readonly auth: AuthenticationService;
	readonly database: LocalDatabase;
	readonly store: TodoStore;
	readonly sync: SyncCoordinator;
	readonly photos: PhotoLibrary;
	readonly attachments: TaskAttachments;
	readonly reminders: ReminderService;
	readonly printer: ListPrinter;
	readonly paneWidths: PaneWidths;
	readonly shares: ShareGateway;
	readonly microsoft: MicrosoftSyncService;
	readonly motion: Motion;
	readonly realtime: RealtimeClient;
}

export interface ContainerOverrides {
	readonly platform: string;
	readonly server?: ServerControls;
	readonly dataStore?: KeyValueStore;
	readonly tokenStore?: KeyValueStore;
	readonly connectivity?: Connectivity;
	readonly authorizationServer?: AuthorizationServer;
	readonly browserSession?: BrowserSession;
	readonly fetcher?: Fetcher;
	readonly authFetcher?: Fetcher;
	readonly clock?: Clock;
	readonly ids?: IdGenerator;
	readonly sounds?: SoundPlayer;
	readonly photoGateway?: PhotoGateway;
	readonly photoPicker?: PhotoPicker;
	readonly attachmentGateway?: AttachmentGateway;
	readonly filePicker?: FilePicker;
	readonly reminderNotifier?: ReminderNotifier;
	readonly printer?: ListPrinter;
	readonly shareGateway?: ShareGateway;
	readonly microsoftAuthorizer?: MicrosoftAuthorizer;
	readonly graphFetcher?: GraphFetcher;
	readonly motion?: Motion;
	readonly sockets?: SocketFactory;
}

export function createContainer(config: AppConfig, overrides: ContainerOverrides): Container {
	const clock = overrides.clock ?? new SystemClock();
	const ids = overrides.ids ?? new RandomIdGenerator();
	const dataStore = overrides.dataStore ?? new AsyncStorageKeyValueStore();
	const tokenStore = overrides.tokenStore ?? createTokenStore(overrides.platform);
	const now = () => clock.now().getTime();
	const authorizationServer = createAuthorizationServer(
		config,
		now,
		overrides.authFetcher,
		overrides.browserSession,
	);
	const auth = new AuthenticationService(
		overrides.authorizationServer ?? authorizationServer,
		new TokenRepository(tokenStore),
		clock,
		config.authentication === "none",
	);
	const database = new LocalDatabase(dataStore);
	const gateway = new HttpApiGateway(config.apiUrl, auth, overrides.fetcher);
	const connectivity = overrides.connectivity ?? new NetInfoConnectivity();
	const sync = new SyncCoordinator(new SyncEngine(database, gateway), connectivity, clock, auth);
	const photos = new PhotoLibrary(
		overrides.photoGateway ??
			new HttpPhotoGateway(
				new AuthorizedHttp(config.apiUrl, auth, overrides.fetcher),
				overrides.fetcher,
			),
		overrides.photoPicker ?? new ExpoPhotoPicker(),
		auth,
	);
	const attachments = new TaskAttachments(
		overrides.attachmentGateway ??
			new HttpAttachmentGateway(
				new AuthorizedHttp(config.apiUrl, auth, overrides.fetcher),
				overrides.fetcher,
			),
		overrides.filePicker ?? new ExpoFilePicker(),
	);
	const store = new TodoStore(
		database,
		ids,
		clock,
		sync,
		overrides.sounds ?? new ExpoSoundPlayer(),
	);
	const reminders = new ReminderService(
		overrides.reminderNotifier ?? createReminderNotifier(),
		store,
		clock,
	);
	const authorizer =
		overrides.microsoftAuthorizer ??
		new ExpoMicrosoftAuthorizer(
			{ clientId: config.microsoftClientId, scheme: config.scheme },
			clock,
		);
	const microsoftSession = new MicrosoftSession(tokenStore, authorizer, clock);
	const microsoftLinks = new LinkRepository(dataStore);
	const microsoft = new MicrosoftSyncService(
		auth,
		authorizer,
		microsoftSession,
		new MicrosoftSyncEngine(
			store,
			new GraphTodoGateway(microsoftSession, overrides.graphFetcher),
			microsoftLinks,
			ids,
			clock,
		),
		microsoftLinks,
		dataStore,
		connectivity,
	);
	return {
		config,
		server: overrides.server ?? { enforced: true, change: async () => undefined },
		auth,
		database,
		store,
		microsoft,
		sync,
		photos,
		attachments,
		reminders,
		printer: overrides.printer ?? new ExpoListPrinter(),
		paneWidths: new PaneWidths(dataStore),
		shares:
			overrides.shareGateway ??
			new HttpShareGateway(new AuthorizedHttp(config.apiUrl, auth, overrides.fetcher)),
		motion: overrides.motion ?? STANDARD_MOTION,
		realtime: new RealtimeClient(
			config.realtimeUrl,
			auth,
			connectivity,
			sync,
			overrides.sockets ?? ((url) => new WebSocket(url) as SocketLike),
		),
	};
}

function createAuthorizationServer(
	config: AppConfig,
	now: () => number,
	fetcher: Fetcher | undefined,
	browser: BrowserSession | undefined,
): AuthorizationServer {
	switch (config.authentication) {
		case "none":
			return new NoAuthorizationServer();
		case "password":
			return new PasswordAuthorizationServer({
				apiUrl: config.apiUrl,
				now,
				fetcher,
				browser: browser ?? new ExpoBrowserSession(config.scheme),
			});
		case "external":
			return new ExpoAuthorizationServer({
				authUrl: config.authUrl,
				clientId: config.clientId,
				scheme: config.scheme,
				now,
			});
	}
}
