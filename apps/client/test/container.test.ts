import { describe, expect, it, vi } from "vitest";

vi.mock("@react-native-async-storage/async-storage", () => ({
	default: { getItem: vi.fn(async () => null), setItem: vi.fn(), removeItem: vi.fn() },
}));
vi.mock("expo-secure-store", () => ({
	getItemAsync: vi.fn(async () => null),
	setItemAsync: vi.fn(),
	deleteItemAsync: vi.fn(),
}));
vi.mock("@react-native-community/netinfo", () => ({
	default: { addEventListener: vi.fn(() => vi.fn()) },
}));
vi.mock("expo-auth-session", () => ({
	AuthRequest: class {
		codeVerifier = "verifier";
		async promptAsync() {
			return { type: "success", params: { code: "code" } };
		}
	},
	ResponseType: { Code: "code" },
	makeRedirectUri: vi.fn(() => "anothertodo://auth/callback"),
	exchangeCodeAsync: vi.fn(async () => ({ accessToken: "a", refreshToken: "r", expiresIn: 3600 })),
}));

import { createContainer } from "../src/container";
import { TEST_CONFIG, createTestContainer } from "./support/test-container";

describe("createContainer", () => {
	it("treats the server as locked when nothing can change it", async () => {
		const { server } = createContainer(TEST_CONFIG, { platform: "web" });
		expect(server.enforced).toBe(true);
		await expect(server.change()).resolves.toBeUndefined();
		await expect(server.logOut()).resolves.toBeUndefined();
	});

	it("wires the real adapters by default on the web and on native", () => {
		for (const platform of ["web", "ios"]) {
			const container = createContainer(TEST_CONFIG, { platform });
			expect(container.auth.get()).toBe("loading");
			expect(container.store.get().tasks).toEqual([]);
			expect(container.sync.get().phase).toBe("idle");
		}
	});

	it("signs in through the default authorization server", async () => {
		const container = createContainer(TEST_CONFIG, { platform: "web" });
		await container.auth.signIn();
		expect(container.auth.get()).toBe("signedIn");
		expect(await container.auth.getAccessToken()).toBe("a");
	});

	it("signs in without credentials when the server has authentication disabled", async () => {
		const container = createContainer(
			{ ...TEST_CONFIG, authentication: "none" },
			{ platform: "web" },
		);
		await container.auth.restore();
		expect(container.auth.automatic).toBe(true);
		expect(container.auth.get()).toBe("signedIn");
		expect(await container.auth.getAccessToken()).toBe("");
	});

	it("signs in with a username and password when the server has its own accounts", async () => {
		const urls: string[] = [];
		const container = createContainer(
			{ ...TEST_CONFIG, authentication: "password" },
			{
				platform: "web",
				authFetcher: async (url) => {
					urls.push(url);
					return new Response(JSON.stringify({ accessToken: "token", expiresIn: 3600 }), {
						status: 200,
					});
				},
			},
		);
		await container.auth.restore();
		expect(container.auth.get()).toBe("signedOut");
		await container.auth.signInWithPassword({ username: "admin", password: "secret" });
		expect(await container.auth.getAccessToken()).toBe("token");
		expect(urls).toEqual(["https://api.test/auth/login"]);
	});

	it("offers Microsoft To Do sync only where Microsoft can return to the app", () => {
		const status = (authentication: "password" | "external" | "none", platform: string) =>
			createContainer({ ...TEST_CONFIG, authentication }, { platform }).microsoft.get();
		expect(status("external", "web")).toBe("idle");
		expect(status("password", "web")).toBe("unavailable");
		expect(status("none", "web")).toBe("unavailable");
		expect(status("password", "android")).toBe("idle");
	});

	it("opens a real WebSocket by default once signed in", async () => {
		const created: string[] = [];
		vi.stubGlobal(
			"WebSocket",
			class {
				constructor(url: string) {
					created.push(url);
				}
				close() {}
			},
		);
		const container = createContainer(TEST_CONFIG, { platform: "web" });
		container.realtime.start();
		await container.auth.signIn();
		await vi.waitFor(() => expect(created).toEqual(["wss://realtime.test/dev?token=a"]));
		container.realtime.stop();
		vi.unstubAllGlobals();
	});

	it("syncs through the configured gateway once signed in", async () => {
		const { container, requests } = createTestContainer();
		await container.auth.signIn();
		await container.sync.syncNow();
		expect(requests.map((request) => `${request.method} ${request.url}`).sort()).toEqual([
			"GET https://api.test/groups",
			"GET https://api.test/lists",
			"GET https://api.test/tasks",
			"GET https://api.test/view-settings",
		]);
	});
});
