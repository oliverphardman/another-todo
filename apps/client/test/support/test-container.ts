import { createContainer, type Container } from "../../src/container";
import { MemoryKeyValueStore } from "../../src/storage/key-value-store";
import type { AppConfig } from "../../src/config/app-config";
import {
	FakeAuthorizationServer,
	FixedClock,
	ManualConnectivity,
	RecordingSoundPlayer,
	SequenceIds,
} from "./fakes";

export const TEST_CONFIG: AppConfig = {
	apiUrl: "https://api.test",
	authUrl: "https://auth.test",
	clientId: "client",
	scheme: "anothertodo",
};

export interface TestContainer {
	readonly container: Container;
	readonly clock: FixedClock;
	readonly connectivity: ManualConnectivity;
	readonly authorizationServer: FakeAuthorizationServer;
	readonly sounds: RecordingSoundPlayer;
	readonly requests: { method: string; url: string; body: unknown }[];
	readonly tokenStore: MemoryKeyValueStore;
	readonly dataStore: MemoryKeyValueStore;
}

export function createTestContainer(
	respond: (method: string, url: string, body: unknown) => Response | Promise<Response> = () =>
		new Response(JSON.stringify({ tasks: [], lists: [] }), { status: 200 }),
): TestContainer {
	const clock = new FixedClock();
	const connectivity = new ManualConnectivity();
	const authorizationServer = new FakeAuthorizationServer();
	const sounds = new RecordingSoundPlayer();
	const tokenStore = new MemoryKeyValueStore();
	const dataStore = new MemoryKeyValueStore();
	const requests: TestContainer["requests"] = [];
	const container = createContainer(TEST_CONFIG, {
		platform: "web",
		dataStore,
		tokenStore,
		connectivity,
		authorizationServer,
		sounds,
		clock,
		ids: new SequenceIds(),
		fetcher: async (input, init) => {
			const body = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
			requests.push({ method: init?.method ?? "GET", url: input, body });
			return await respond(init?.method ?? "GET", input, body);
		},
	});
	return {
		container,
		clock,
		connectivity,
		authorizationServer,
		sounds,
		requests,
		tokenStore,
		dataStore,
	};
}
