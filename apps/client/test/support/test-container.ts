import { createContainer, type Container } from "../../src/container";
import { NO_MOTION, type Motion } from "../../src/ui/motion";
import { MemoryKeyValueStore } from "../../src/storage/key-value-store";
import type { AppConfig } from "../../src/config/app-config";
import {
	FakeAuthorizationServer,
	FakeSocket,
	FixedClock,
	ManualConnectivity,
	FakePhotoGateway,
	FakePhotoPicker,
	RecordingPrinter,
	RecordingSoundPlayer,
	SequenceIds,
} from "./fakes";

export const TEST_CONFIG: AppConfig = {
	apiUrl: "https://api.test",
	authUrl: "https://auth.test",
	clientId: "client",
	realtimeUrl: "wss://realtime.test/dev",
	scheme: "anothertodo",
};

export interface TestContainer {
	readonly container: Container;
	readonly clock: FixedClock;
	readonly connectivity: ManualConnectivity;
	readonly authorizationServer: FakeAuthorizationServer;
	readonly sounds: RecordingSoundPlayer;
	readonly printer: RecordingPrinter;
	readonly photoGateway: FakePhotoGateway;
	readonly photoPicker: FakePhotoPicker;
	readonly sockets: FakeSocket[];
	readonly requests: { method: string; url: string; body: unknown }[];
	readonly tokenStore: MemoryKeyValueStore;
	readonly dataStore: MemoryKeyValueStore;
}

export function createTestContainer(
	respond: (method: string, url: string, body: unknown) => Response | Promise<Response> = () =>
		new Response(JSON.stringify({ tasks: [], lists: [], settings: [] }), { status: 200 }),
	motion: Motion = NO_MOTION,
): TestContainer {
	const clock = new FixedClock();
	const connectivity = new ManualConnectivity();
	const authorizationServer = new FakeAuthorizationServer();
	const sounds = new RecordingSoundPlayer();
	const printer = new RecordingPrinter();
	const photoGateway = new FakePhotoGateway();
	const photoPicker = new FakePhotoPicker();
	const tokenStore = new MemoryKeyValueStore();
	const dataStore = new MemoryKeyValueStore();
	const requests: TestContainer["requests"] = [];
	const sockets: FakeSocket[] = [];
	const container = createContainer(TEST_CONFIG, {
		platform: "web",
		dataStore,
		tokenStore,
		connectivity,
		authorizationServer,
		sounds,
		printer,
		photoGateway,
		photoPicker,
		clock,
		motion,
		sockets: (url) => {
			const socket = new FakeSocket(url);
			sockets.push(socket);
			return socket;
		},
		ids: new SequenceIds(),
		fetcher: async (input, init) => {
			const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
			requests.push({ method: init?.method ?? "GET", url: input, body });
			return await respond(init?.method ?? "GET", input, body);
		},
	});
	return {
		container,
		sockets,
		clock,
		connectivity,
		authorizationServer,
		sounds,
		printer,
		photoGateway,
		photoPicker,
		requests,
		tokenStore,
		dataStore,
	};
}
