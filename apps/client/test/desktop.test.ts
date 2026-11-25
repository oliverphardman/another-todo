import { createHash, randomBytes } from "node:crypto";
import { Linking, AppRegistry } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopAuthorizationServer } from "../src/auth/desktop-authorization-server";
import { ExpoAuthorizationServer as MacAuth } from "../src/auth/expo-authorization-server.macos";
import { ExpoAuthorizationServer as WinAuth } from "../src/auth/expo-authorization-server.windows";
import { LinkingDeepLinks, type DeepLinks } from "../src/auth/deep-links";
import { Pkce } from "../src/auth/pkce";
import { SystemRandom } from "../src/domain/random";
import { Base64Url, Sha256 } from "../src/auth/sha256";
import { ExpoSoundPlayer as MacSound } from "../src/audio/expo-sound-player.macos";
import { ExpoSoundPlayer as WinSound } from "../src/audio/expo-sound-player.windows";
import { DesktopSoundPlayer } from "../src/audio/desktop-sound-player";
import { SilentSoundPlayer } from "../src/audio/silent-sound-player";
import { DeviceLocale as MacLocale } from "../src/i18n/device-locale.macos";
import { DeviceLocale as WinLocale } from "../src/i18n/device-locale.windows";
import { ExpoPhotoPicker as MacPicker } from "../src/photos/expo-photo-picker.macos";
import { ExpoPhotoPicker as WinPicker } from "../src/photos/expo-photo-picker.windows";
import { UnavailablePhotoPicker } from "../src/photos/unavailable-photo-picker";
import { ExpoListPrinter as MacPrinter } from "../src/print/expo-list-printer.macos";
import { ExpoListPrinter as WinPrinter } from "../src/print/expo-list-printer.windows";
import { UnavailableListPrinter } from "../src/print/unavailable-list-printer";
import { SecureStoreKeyValueStore as MacStore } from "../src/storage/secure-store-key-value-store.macos";
import { SecureStoreKeyValueStore as WinStore } from "../src/storage/secure-store-key-value-store.windows";
import { NetInfoConnectivity as WinConnectivity } from "../src/state/connectivity.windows";
import { AlwaysOnlineConnectivity } from "../src/state/always-online-connectivity";
import { AsyncStorageKeyValueStore } from "../src/storage/async-storage-key-value-store";

vi.mock("../App", () => ({ default: () => null }));

afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

describe("Sha256", () => {
	it("matches the platform digest for messages around every padding boundary", () => {
		for (const length of [0, 1, 3, 55, 56, 63, 64, 65, 119, 120, 1000]) {
			const message = randomBytes(length);
			expect(Buffer.from(Sha256.digest(message)).toString("hex")).toBe(
				createHash("sha256").update(message).digest("hex"),
			);
		}
		expect(Buffer.from(Sha256.digest(new TextEncoder().encode("abc"))).toString("hex")).toBe(
			"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
		);
	});
});

describe("Base64Url", () => {
	it("encodes with the URL alphabet and no padding", () => {
		for (const length of [0, 1, 2, 3, 4, 5, 32]) {
			const bytes = randomBytes(length);
			expect(Base64Url.encode(bytes)).toBe(bytes.toString("base64url"));
		}
		expect(Base64Url.encode(Uint8Array.from([0xfb, 0xff]))).toBe("-_8");
	});
});

describe("Pkce and SystemRandom", () => {
	it("derives the challenge from the verifier", () => {
		const pair = Pkce.create({ bytes: (length) => new Uint8Array(length).fill(7) });
		expect(pair.challenge).toBe(createHash("sha256").update(pair.verifier).digest("base64url"));
		expect(pair.verifier).toHaveLength(64);
		expect(pair.state).not.toBe(pair.verifier);
	});

	it("uses the platform random source when there is one and falls back otherwise", () => {
		const filled = new SystemRandom().bytes(16);
		expect(filled).toHaveLength(16);
		const getRandomValues = vi.fn((array: Uint8Array) => array.fill(9));
		vi.stubGlobal("crypto", { getRandomValues });
		expect([...new SystemRandom().bytes(3)]).toEqual([9, 9, 9]);
		vi.stubGlobal("crypto", {});
		expect(new SystemRandom().bytes(8)).toHaveLength(8);
		vi.stubGlobal("crypto", undefined);
		expect(new SystemRandom().bytes(8)).toHaveLength(8);
	});
});

describe("LinkingDeepLinks", () => {
	it("opens URLs and resolves with the first link that starts with the prefix", async () => {
		const open = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined as never);
		const remove = vi.fn();
		let listener: ((event: { url: string }) => void) | undefined;
		vi.spyOn(Linking, "addEventListener").mockImplementation(((_: string, handler: never) => {
			listener = handler;
			return { remove };
		}) as never);
		const links = new LinkingDeepLinks();
		await links.open("https://auth.test");
		expect(open).toHaveBeenCalledWith("https://auth.test");
		const waiting = links.waitFor("anothertodo://auth/callback", 1000);
		listener!({ url: "https://other" });
		listener!({ url: "anothertodo://auth/callback?code=1" });
		expect(await waiting).toBe("anothertodo://auth/callback?code=1");
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it("gives up after the timeout", async () => {
		vi.useFakeTimers();
		const remove = vi.fn();
		vi.spyOn(Linking, "addEventListener").mockReturnValue({ remove } as never);
		const waiting = new LinkingDeepLinks().waitFor("anothertodo://", 500);
		await vi.advanceTimersByTimeAsync(500);
		expect(await waiting).toBeNull();
		expect(remove).toHaveBeenCalled();
		vi.useRealTimers();
	});
});

describe("DesktopAuthorizationServer", () => {
	const config = {
		authUrl: "https://auth.test",
		clientId: "client",
		scheme: "anothertodo",
		now: () => 1_000,
	};

	function setup(returned: (url: string) => string | null, respond?: () => Response) {
		const opened: string[] = [];
		const posts: { url: string; body: string }[] = [];
		const links: DeepLinks = {
			open: async (url) => {
				opened.push(url);
			},
			waitFor: async () => {
				const url = new URL(opened[0] ?? "https://x");
				void url;
				return null;
			},
		};
		let pending: ((value: string | null) => void) | undefined;
		const wait = new Promise<string | null>((resolve) => {
			pending = resolve;
		});
		const wired: DeepLinks = {
			open: async (url) => {
				opened.push(url);
				pending!(returned(url));
			},
			waitFor: () => wait,
		};
		void links;
		const server = new DesktopAuthorizationServer(config, {
			links: wired,
			random: { bytes: (length) => new Uint8Array(length).fill(1) },
			fetcher: async (url, init) => {
				posts.push({ url, body: String(init.body) });
				return (
					respond?.() ??
					new Response(JSON.stringify({ access_token: "a", refresh_token: "r", expires_in: 60 }), {
						status: 200,
					})
				);
			},
		});
		return { server, opened, posts };
	}

	const callback = (url: string, overrides: Record<string, string | null> = {}) => {
		const state = new URL(url).searchParams.get("state");
		const params = new URLSearchParams({ code: "code-1", state: state! });
		for (const [key, value] of Object.entries(overrides)) {
			if (value === null) {
				params.delete(key);
			} else {
				params.set(key, value);
			}
		}
		return `anothertodo://auth/callback?${params.toString()}`;
	};

	it("opens the hosted UI with a PKCE challenge and exchanges the returned code", async () => {
		const { server, opened, posts } = setup((url) => callback(url));
		const tokens = await server.authorize();
		const query = new URL(opened[0]!).searchParams;
		expect(opened[0]!.startsWith("https://auth.test/oauth2/authorize?")).toBe(true);
		expect(query.get("code_challenge_method")).toBe("S256");
		expect(query.get("redirect_uri")).toBe("anothertodo://auth/callback");
		expect(query.get("identity_provider")).toBeNull();
		expect(posts[0]!.url).toBe("https://auth.test/oauth2/token");
		const form = new URLSearchParams(posts[0]!.body);
		expect(form.get("grant_type")).toBe("authorization_code");
		expect(form.get("code")).toBe("code-1");
		expect(createHash("sha256").update(form.get("code_verifier")!).digest("base64url")).toBe(
			query.get("code_challenge"),
		);
		expect(tokens).toEqual({ accessToken: "a", refreshToken: "r", expiresAt: 1_000 + 60_000 });
	});

	it("passes the identity provider through", async () => {
		const { server, opened } = setup((url) => callback(url));
		await server.authorize("Microsoft");
		expect(new URL(opened[0]!).searchParams.get("identity_provider")).toBe("Microsoft");
	});

	it("returns null when sign-in times out, is denied or the state does not match", async () => {
		expect(await setup(() => null).server.authorize()).toBeNull();
		expect(await setup((url) => callback(url, { code: null })).server.authorize()).toBeNull();
		expect(await setup((url) => callback(url, { state: "forged" })).server.authorize()).toBeNull();
	});

	it("refreshes, defaults the lifetime and keeps no refresh token when none is returned", async () => {
		const { server, posts } = setup(
			() => null,
			() => new Response(JSON.stringify({ access_token: "b" }), { status: 200 }),
		);
		expect(await server.refresh("old")).toEqual({
			accessToken: "b",
			refreshToken: null,
			expiresAt: 1_000 + 3_600_000,
		});
		expect(new URLSearchParams(posts[0]!.body).get("grant_type")).toBe("refresh_token");
	});

	it("revokes the refresh token and reports server errors", async () => {
		const { server, posts } = setup(() => null);
		await server.revoke("r1");
		expect(posts[0]!.url).toBe("https://auth.test/oauth2/revoke");
		const failing = setup(
			() => null,
			() => new Response("no", { status: 400 }),
		);
		await expect(failing.server.refresh("x")).rejects.toThrow("returned 400");
	});

	it("builds its default dependencies", async () => {
		const fetched = vi.fn(async () => new Response(JSON.stringify({ access_token: "z" })));
		vi.stubGlobal("fetch", fetched);
		const server = new DesktopAuthorizationServer(config);
		await server.refresh("r");
		expect(fetched).toHaveBeenCalledTimes(1);
	});
});

describe("desktop platform adapters", () => {
	it("selects the desktop implementations through the platform file extensions", async () => {
		expect(MacAuth).toBe(DesktopAuthorizationServer);
		expect(WinAuth).toBe(DesktopAuthorizationServer);
		expect(MacStore).toBe(AsyncStorageKeyValueStore);
		expect(WinStore).toBe(AsyncStorageKeyValueStore);
		expect(new MacSound()).toBeInstanceOf(DesktopSoundPlayer);
		expect(WinSound).toBe(SilentSoundPlayer);
		expect(MacPicker).toBe(UnavailablePhotoPicker);
		expect(WinPicker).toBe(UnavailablePhotoPicker);
		expect(MacPrinter).toBe(UnavailableListPrinter);
		expect(WinPrinter).toBe(UnavailableListPrinter);
		expect(new SilentSoundPlayer().playCompleted()).toBeUndefined();
		expect(await new UnavailablePhotoPicker().pick()).toBeNull();
		await expect(new UnavailableListPrinter().print()).resolves.toBeUndefined();
	});

	it("resolves the locale from Intl on desktop", () => {
		const resolved = vi
			.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions")
			.mockReturnValue({ locale: "en-GB" } as Intl.ResolvedDateTimeFormatOptions);
		expect(MacLocale.resolved()).toBe("en-GB");
		resolved.mockReturnValue({ locale: "fr-FR" } as Intl.ResolvedDateTimeFormatOptions);
		expect(WinLocale.resolved()).toBe("en-US");
	});

	it("registers the app under the main component name", async () => {
		const register = vi.spyOn(AppRegistry, "registerComponent").mockImplementation(() => "main");
		await import("../index.macos");
		vi.resetModules();
		await import("../index.windows");
		expect(register).toHaveBeenCalledTimes(2);
		for (const [, factory] of register.mock.calls) {
			expect(factory()).toBeDefined();
		}
		expect(register.mock.calls.map(([name]) => name)).toEqual(["main", "main"]);
	});
});

describe("Windows connectivity", () => {
	it("is the always online implementation and never notifies", () => {
		const connectivity = new WinConnectivity();
		expect(connectivity).toBeInstanceOf(AlwaysOnlineConnectivity);
		expect(connectivity.isOnline()).toBe(true);
		expect(connectivity.subscribe()()).toBeUndefined();
	});
});
