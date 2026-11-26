import { describe, expect, it } from "vitest";
import { AppConfigReader } from "../src/config/app-config";
import { ServerInfoLoader, ServerUnreachableError } from "../src/config/server-info";
import { ServerSession, ServerSessions, type ServerState } from "../src/config/server-session";
import { ServerSettings } from "../src/config/server-settings";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";

const BUILD = AppConfigReader.read({}, undefined, undefined);

function reply(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status });
}

describe("ServerInfoLoader", () => {
	it("reads what the server says about itself", async () => {
		const urls: string[] = [];
		const loader = new ServerInfoLoader(async (url) => {
			urls.push(url);
			return reply({ authentication: "password", notice: "Hi", realtimeUrl: "wss://rt" });
		});
		expect(await loader.load("https://todo.example.com")).toEqual({
			authentication: "password",
			providers: [],
			notice: "Hi",
			realtimeUrl: "wss://rt",
			signIn: null,
		});
		expect(urls).toEqual(["https://todo.example.com/config"]);
	});

	it("keeps only the identity providers it knows", async () => {
		const loader = new ServerInfoLoader(async () =>
			reply({ authentication: "password", providers: ["Microsoft", "Facebook"] }),
		);
		expect((await loader.load("https://x")).providers).toEqual(["Microsoft"]);
	});

	it("treats missing optional fields as absent", async () => {
		const loader = new ServerInfoLoader(async () => reply({ authentication: "none" }));
		expect(await loader.load("https://x")).toEqual({
			authentication: "none",
			providers: [],
			notice: null,
			realtimeUrl: null,
			signIn: null,
		});
	});

	it("learns where to sign in on a server with external authentication", async () => {
		const signIn = { url: "https://auth.example.com", clientId: "app" };
		const loader = new ServerInfoLoader(async () => reply({ authentication: "external", signIn }));
		expect((await loader.load("https://x")).signIn).toEqual(signIn);
	});

	it.each([
		["nothing", undefined],
		["null", null],
		["no client id", { url: "https://auth.example.com" }],
		["no address", { clientId: "app" }],
		["an insecure address", { url: "http://auth.example.com", clientId: "app" }],
		["a script address", { url: "javascript:alert(1)", clientId: "app" }],
	])("rejects external authentication that offers %s to sign in with", async (_name, signIn) => {
		const loader = new ServerInfoLoader(async () => reply({ authentication: "external", signIn }));
		await expect(loader.load("https://x")).rejects.toBeInstanceOf(ServerUnreachableError);
	});

	it("reports servers that are down, not ours or answer with an error", async () => {
		const down = new ServerInfoLoader(async () => {
			throw new Error("offline");
		});
		await expect(down.load("https://x")).rejects.toBeInstanceOf(ServerUnreachableError);
		const foreign = new ServerInfoLoader(async () => reply({ hello: "world" }));
		await expect(foreign.load("https://x")).rejects.toThrow("Could not reach https://x");
		const failing = new ServerInfoLoader(async () => reply({ authentication: "none" }, 500));
		await expect(failing.load("https://x")).rejects.toBeInstanceOf(ServerUnreachableError);
	});

	it("uses fetch by default", async () => {
		const loader = new ServerInfoLoader();
		await expect(loader.load("http://127.0.0.1:1")).rejects.toBeInstanceOf(ServerUnreachableError);
	});
});

function setup(
	options: { enforced?: string | null; answer?: () => Response | Promise<Response> } = {},
) {
	const store = new MemoryKeyValueStore();
	const settings = new ServerSettings(store, options.enforced ?? null, async () => undefined);
	const answer = options.answer ?? (() => reply({ authentication: "none" }));
	const session = new ServerSession(BUILD, settings, new ServerInfoLoader(async () => answer()));
	const states: ServerState[] = [];
	session.subscribe(() => states.push(session.get()));
	return { session, store, states };
}

describe("ServerSession", () => {
	it("asks for an address when none is known, then connects", async () => {
		const { session, store } = setup();
		expect(session.get().status).toBe("resolving");
		expect(session.enforced).toBe(false);
		await session.start();
		expect(session.get()).toEqual({ status: "needsUrl", invalid: false });
		await session.connect("todo.example.com");
		const state = session.get();
		expect(state.status).toBe("ready");
		expect(state.status === "ready" && state.config.serverUrl).toBe("https://todo.example.com");
		expect(await store.get("atd.serverUrl")).toBe("https://todo.example.com");
	});

	it("remembers the chosen server", async () => {
		const first = setup();
		await first.session.connect("todo.example.com");
		const second = new ServerSession(
			BUILD,
			new ServerSettings(first.store, null, async () => undefined),
			new ServerInfoLoader(async () => reply({ authentication: "none" })),
		);
		await second.start();
		expect(second.get().status).toBe("ready");
	});

	it("rejects an address that is not a web address", async () => {
		const { session } = setup();
		await session.connect("ftp://example.com");
		expect(session.get()).toEqual({ status: "needsUrl", invalid: true });
	});

	it("goes straight to an enforced server", async () => {
		const { session } = setup({ enforced: "https://demo.example.com" });
		await session.start();
		expect(session.enforced).toBe(true);
		const state = session.get();
		expect(state.status === "ready" && state.config.apiUrl).toBe("https://demo.example.com");
	});

	it("offers a retry or a change when the server cannot be reached", async () => {
		let up = false;
		const { session } = setup({
			answer: () => (up ? reply({ authentication: "none" }) : reply({}, 500)),
		});
		await session.connect("todo.example.com");
		expect(session.get()).toEqual({ status: "unreachable", url: "https://todo.example.com" });
		up = true;
		await session.retry();
		expect(session.get().status).toBe("ready");
		await session.change();
		expect(session.get()).toEqual({ status: "needsUrl", invalid: false });
		await session.start();
		expect(session.get().status).toBe("needsUrl");
	});
});

describe("ServerSessions", () => {
	it("discards the previous server's data and tokens when the server changes", async () => {
		const data = new MemoryKeyValueStore();
		const tokens = new MemoryKeyValueStore();
		const loader = new ServerInfoLoader(async () => reply({ authentication: "none" }));
		await data.set("atd.snapshot", "old");
		await tokens.set("atd.tokens", "old");
		const first = ServerSessions.create(BUILD, data, tokens, loader);
		await first.connect("a.example.com");
		await data.set("atd.snapshot", "a's data");
		await tokens.set("atd.tokens", "a's token");
		const second = ServerSessions.create(BUILD, data, tokens, loader);
		await second.connect("b.example.com");
		expect(await data.get("atd.snapshot")).toBeNull();
		expect(await tokens.get("atd.tokens")).toBeNull();
	});

	it("loads server information with fetch by default", async () => {
		const session = ServerSessions.create(
			BUILD,
			new MemoryKeyValueStore(),
			new MemoryKeyValueStore(),
		);
		await session.connect("http://127.0.0.1:1");
		expect(session.get().status).toBe("unreachable");
	});
});
