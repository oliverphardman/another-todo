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
	it("uses the production endpoints by default", () => {
		expect(AppConfigReader.read({})).toEqual({
			apiUrl: "https://api.another-todo.oliverhardman.dev",
			authUrl: "https://auth.another-todo.oliverhardman.dev",
			clientId: "rm2gcmocak3qo442q9p0r191q",
			realtimeUrl: "wss://s1gss3s4qg.execute-api.eu-west-1.amazonaws.com/dev",
			scheme: "anothertodo",
		});
	});

	it("accepts overrides and trims trailing slashes", () => {
		const config = AppConfigReader.read({
			EXPO_PUBLIC_API_URL: "http://localhost:3000/",
			EXPO_PUBLIC_AUTH_URL: "http://localhost:9000//",
			EXPO_PUBLIC_CLIENT_ID: "dev-client",
			EXPO_PUBLIC_REALTIME_URL: "ws://localhost:3001/",
		});
		expect(config).toMatchObject({
			apiUrl: "http://localhost:3000",
			authUrl: "http://localhost:9000",
			clientId: "dev-client",
			realtimeUrl: "ws://localhost:3001",
		});
	});
});
