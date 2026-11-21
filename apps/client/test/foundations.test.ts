import { describe, expect, it, vi } from "vitest";
import { AppConfigReader } from "../src/config/app-config";
import { RandomIdGenerator, SystemClock } from "../src/domain/ports";
import { Observable } from "../src/state/observable";

class Counter extends Observable<number> {
	increment(): void {
		this.set(this.get() + 1);
	}
}

describe("Observable", () => {
	it("notifies subscribers until they unsubscribe", () => {
		const counter = new Counter(0);
		const listener = vi.fn();
		const unsubscribe = counter.subscribe(listener);
		counter.increment();
		unsubscribe();
		counter.increment();
		expect(listener).toHaveBeenCalledTimes(1);
		expect(counter.get()).toBe(2);
	});

	it("tolerates listeners that unsubscribe while being notified", () => {
		const counter = new Counter(0);
		const calls: string[] = [];
		const first = counter.subscribe(() => {
			calls.push("first");
			first();
		});
		counter.subscribe(() => calls.push("second"));
		counter.increment();
		counter.increment();
		expect(calls).toEqual(["first", "second", "second"]);
	});
});

describe("ports", () => {
	it("provides real time and unique ids", () => {
		const before = Date.now();
		expect(new SystemClock().now().getTime()).toBeGreaterThanOrEqual(before);
		const ids = new RandomIdGenerator();
		expect(ids.next()).toMatch(/^[0-9a-f-]{36}$/);
		expect(ids.next()).not.toBe(ids.next());
	});

	it("generated ids satisfy the API's id rule", () => {
		expect(new RandomIdGenerator().next()).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
	});
});

describe("AppConfigReader", () => {
	it("starts with no enforced server and no external sign-in", () => {
		expect(AppConfigReader.read({}, undefined, undefined)).toEqual({
			authUrl: "",
			clientId: "",
			microsoftClientId: "dbb91251-9be4-4765-8e99-f20806a78f1a",
			scheme: "anothertodo",
			enforcedServerUrl: null,
		});
	});

	it("reads the build-time settings and trims trailing slashes", () => {
		expect(
			AppConfigReader.read({
				EXPO_PUBLIC_ENFORCED_SERVER_URL: " https://todo.example.com// ",
				EXPO_PUBLIC_AUTH_URL: "http://localhost:9000//",
				EXPO_PUBLIC_CLIENT_ID: "dev-client",
				EXPO_PUBLIC_MICROSOFT_CLIENT_ID: "dev-ms",
			}),
		).toEqual({
			authUrl: "http://localhost:9000",
			clientId: "dev-client",
			microsoftClientId: "dev-ms",
			scheme: "anothertodo",
			enforcedServerUrl: "https://todo.example.com",
		});
	});

	it("lets the runtime configuration of a hosted web app enforce its server", () => {
		const env = { EXPO_PUBLIC_ENFORCED_SERVER_URL: "https://built.example.com" };
		expect(
			AppConfigReader.read(env, { serverUrl: "https://api.example.com/", enforced: true })
				.enforcedServerUrl,
		).toBe("https://api.example.com");
		expect(
			AppConfigReader.read(env, { serverUrl: "", enforced: true }, "https://todo.example.com")
				.enforcedServerUrl,
		).toBe("https://todo.example.com");
		expect(
			AppConfigReader.read(env, { serverUrl: "https://x.example.com", enforced: false })
				.enforcedServerUrl,
		).toBe("https://built.example.com");
	});

	it("reads the runtime configuration and origin from the page by default", () => {
		vi.stubGlobal("__ATD_CONFIG__", { serverUrl: "", enforced: true });
		expect(AppConfigReader.read({}).enforcedServerUrl).toBe(globalThis.location.origin);
		vi.unstubAllGlobals();
	});

	it("offers Microsoft on an external server and what the server lists otherwise", () => {
		const build = AppConfigReader.read({}, undefined, undefined);
		const info = { notice: null, realtimeUrl: null } as const;
		expect(
			AppConfigReader.compose(build, "https://x", {
				...info,
				authentication: "external",
				providers: [],
			}).providers,
		).toEqual(["Microsoft"]);
		expect(
			AppConfigReader.compose(build, "https://x", {
				...info,
				authentication: "password",
				providers: ["Microsoft"],
			}).providers,
		).toEqual(["Microsoft"]);
	});

	it("combines the build and the server's answers", () => {
		const build = AppConfigReader.read({ EXPO_PUBLIC_CLIENT_ID: "c" }, undefined, undefined);
		const base = { authentication: "password", providers: [], notice: "Hello" } as const;
		expect(
			AppConfigReader.compose(build, "https://todo.example.com/", { ...base, realtimeUrl: null }),
		).toMatchObject({
			serverUrl: "https://todo.example.com",
			apiUrl: "https://todo.example.com",
			realtimeUrl: "wss://todo.example.com/realtime",
			authentication: "password",
			notice: "Hello",
			clientId: "c",
		});
		expect(
			AppConfigReader.compose(build, "http://localhost:3000", { ...base, realtimeUrl: null })
				.realtimeUrl,
		).toBe("ws://localhost:3000/realtime");
		expect(
			AppConfigReader.compose(build, "https://x.example.com", {
				...base,
				realtimeUrl: "wss://rt.example.com/dev",
			}).realtimeUrl,
		).toBe("wss://rt.example.com/dev");
	});
});
