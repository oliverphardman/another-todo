import { AuthorizedHttp, type Fetcher } from "./api/authorized-http";
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
import { ExpoSoundPlayer } from "./audio/expo-sound-player";
import type { SoundPlayer } from "./audio/sound-player";
import { HttpApiGateway } from "./api/http-api-gateway";
import { AuthenticationService } from "./auth/authentication-service";
import type { AuthorizationServer } from "./auth/authorization-server";
import { DemoAuthorizationServer } from "./auth/demo-authorization-server";
import { ExpoAuthorizationServer } from "./auth/expo-authorization-server";
import { TokenRepository } from "./auth/token-repository";
import type { AppConfig } from "./config/app-config";
import { RandomIdGenerator, SystemClock, type Clock, type IdGenerator } from "./domain/ports";
import { NetInfoConnectivity, type Connectivity } from "./state/connectivity";
import { PaneWidths } from "./state/pane-widths";
import { STANDARD_MOTION, type Motion } from "./ui/motion";
import { TodoStore } from "./state/todo-store";
import { AsyncStorageKeyValueStore } from "./storage/async-storage-key-value-store";
import type { KeyValueStore } from "./storage/key-value-store";
import { LocalDatabase } from "./storage/local-database";
import { SecureStoreKeyValueStore } from "./storage/secure-store-key-value-store";
import { RealtimeClient, type SocketFactory, type SocketLike } from "./sync/realtime-client";
import { SyncCoordinator } from "./sync/sync-coordinator";
import { SyncEngine } from "./sync/sync-engine";

export interface Container {
	readonly auth: AuthenticationService;
	readonly database: LocalDatabase;
	readonly store: TodoStore;
	readonly sync: SyncCoordinator;
	readonly photos: PhotoLibrary;
	readonly printer: ListPrinter;
	readonly paneWidths: PaneWidths;
	readonly shares: ShareGateway;
	readonly microsoft: MicrosoftSyncService;
	readonly motion: Motion;
	readonly realtime: RealtimeClient;
}

export interface ContainerOverrides {
	readonly platform: string;
	readonly dataStore?: KeyValueStore;
	readonly tokenStore?: KeyValueStore;
	readonly connectivity?: Connectivity;
	readonly authorizationServer?: AuthorizationServer;
	readonly fetcher?: Fetcher;
	readonly authFetcher?: Fetcher;
	readonly clock?: Clock;
	readonly ids?: IdGenerator;
	readonly sounds?: SoundPlayer;
	readonly photoGateway?: PhotoGateway;
	readonly photoPicker?: PhotoPicker;
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
	const tokenStore =
		overrides.tokenStore ??
		(overrides.platform === "web"
			? new AsyncStorageKeyValueStore()
			: new SecureStoreKeyValueStore());
	const now = () => clock.now().getTime();
	const server =
		config.demo === null
			? new ExpoAuthorizationServer({
					authUrl: config.authUrl,
					clientId: config.clientId,
					scheme: config.scheme,
					now,
				})
			: new DemoAuthorizationServer({
					...config.demo,
					clientId: config.clientId,
					now,
					fetcher: overrides.authFetcher,
				});
	const auth = new AuthenticationService(
		overrides.authorizationServer ?? server,
		new TokenRepository(tokenStore),
		clock,
		config.demo !== null,
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
	const store = new TodoStore(
		database,
		ids,
		clock,
		sync,
		overrides.sounds ?? new ExpoSoundPlayer(),
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
		auth,
		database,
		store,
		microsoft,
		sync,
		photos,
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
