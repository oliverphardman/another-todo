import { AuthorizedHttp, type Fetcher } from "./api/authorized-http";
import { ExpoPhotoPicker } from "./photos/expo-photo-picker";
import { HttpPhotoGateway } from "./photos/http-photo-gateway";
import { PhotoLibrary } from "./photos/photo-library";
import type { PhotoGateway, PhotoPicker } from "./photos/photo-gateway";
import { ExpoListPrinter } from "./print/expo-list-printer";
import type { ListPrinter } from "./print/list-print-document";
import { ExpoSoundPlayer } from "./audio/expo-sound-player";
import type { SoundPlayer } from "./audio/sound-player";
import { HttpApiGateway } from "./api/http-api-gateway";
import { AuthenticationService } from "./auth/authentication-service";
import type { AuthorizationServer } from "./auth/authorization-server";
import { ExpoAuthorizationServer } from "./auth/expo-authorization-server";
import { TokenRepository } from "./auth/token-repository";
import type { AppConfig } from "./config/app-config";
import { RandomIdGenerator, SystemClock, type Clock, type IdGenerator } from "./domain/ports";
import { NetInfoConnectivity, type Connectivity } from "./state/connectivity";
import { TodoStore } from "./state/todo-store";
import { AsyncStorageKeyValueStore } from "./storage/async-storage-key-value-store";
import type { KeyValueStore } from "./storage/key-value-store";
import { LocalDatabase } from "./storage/local-database";
import { SecureStoreKeyValueStore } from "./storage/secure-store-key-value-store";
import { SyncCoordinator } from "./sync/sync-coordinator";
import { SyncEngine } from "./sync/sync-engine";

export interface Container {
	readonly auth: AuthenticationService;
	readonly database: LocalDatabase;
	readonly store: TodoStore;
	readonly sync: SyncCoordinator;
	readonly photos: PhotoLibrary;
	readonly printer: ListPrinter;
}

export interface ContainerOverrides {
	readonly platform: string;
	readonly dataStore?: KeyValueStore;
	readonly tokenStore?: KeyValueStore;
	readonly connectivity?: Connectivity;
	readonly authorizationServer?: AuthorizationServer;
	readonly fetcher?: Fetcher;
	readonly clock?: Clock;
	readonly ids?: IdGenerator;
	readonly sounds?: SoundPlayer;
	readonly photoGateway?: PhotoGateway;
	readonly photoPicker?: PhotoPicker;
	readonly printer?: ListPrinter;
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
	const auth = new AuthenticationService(
		overrides.authorizationServer ??
			new ExpoAuthorizationServer({
				authUrl: config.authUrl,
				clientId: config.clientId,
				scheme: config.scheme,
				now: () => clock.now().getTime(),
			}),
		new TokenRepository(tokenStore),
		clock,
	);
	const database = new LocalDatabase(dataStore);
	const gateway = new HttpApiGateway(config.apiUrl, auth, overrides.fetcher);
	const sync = new SyncCoordinator(
		new SyncEngine(database, gateway),
		overrides.connectivity ?? new NetInfoConnectivity(),
		clock,
		auth,
	);
	const photos = new PhotoLibrary(
		overrides.photoGateway ??
			new HttpPhotoGateway(
				new AuthorizedHttp(config.apiUrl, auth, overrides.fetcher),
				overrides.fetcher,
			),
		overrides.photoPicker ?? new ExpoPhotoPicker(),
		auth,
	);
	return {
		auth,
		database,
		store: new TodoStore(database, ids, clock, sync, overrides.sounds ?? new ExpoSoundPlayer()),
		sync,
		photos,
		printer: overrides.printer ?? new ExpoListPrinter(),
	};
}
