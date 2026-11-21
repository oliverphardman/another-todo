import { describe, expect, it, vi } from "vitest";
import { InvalidServerUrlError, ServerSettings } from "../src/config/server-settings";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { LocalData } from "../src/storage/local-data";

describe("ServerSettings", () => {
	it("normalizes what people type", () => {
		expect(ServerSettings.normalize("todo.example.com")).toBe("https://todo.example.com");
		expect(ServerSettings.normalize(" https://todo.example.com/ ")).toBe(
			"https://todo.example.com",
		);
		expect(ServerSettings.normalize("http://192.168.1.5:3000")).toBe("http://192.168.1.5:3000");
		expect(ServerSettings.normalize("https://example.com/todo/")).toBe("https://example.com/todo");
	});

	it("rejects anything that is not a web address", () => {
		for (const input of ["", "   ", "ftp://example.com", "https://", "http://exa mple.com"]) {
			expect(() => ServerSettings.normalize(input)).toThrow(InvalidServerUrlError);
		}
	});

	it("prefers the enforced server over the chosen one", async () => {
		const store = new MemoryKeyValueStore();
		const free = new ServerSettings(store, null, async () => undefined);
		expect(free.enforced).toBe(false);
		expect(await free.current()).toBeNull();
		expect(await free.choose("todo.example.com")).toBe("https://todo.example.com");
		expect(await free.current()).toBe("https://todo.example.com");
		await free.forget();
		expect(await free.current()).toBeNull();
		const locked = new ServerSettings(store, "https://demo.example.com", async () => undefined);
		await locked.choose("other.example.com");
		expect(locked.enforced).toBe(true);
		expect(await locked.current()).toBe("https://demo.example.com");
	});

	it("discards local data only when the data belongs to another server", async () => {
		const discard = vi.fn(async () => undefined);
		const settings = new ServerSettings(new MemoryKeyValueStore(), null, discard);
		await settings.claim("https://a.example.com");
		await settings.claim("https://a.example.com");
		expect(discard).not.toHaveBeenCalled();
		await settings.claim("https://b.example.com");
		expect(discard).toHaveBeenCalledTimes(1);
	});
});

describe("LocalData", () => {
	it("removes the synced data and every token", async () => {
		const data = new MemoryKeyValueStore();
		const tokens = new MemoryKeyValueStore();
		for (const key of ["atd.snapshot", "atd.paneWidths", "atd.msLinks", "atd.msPrefs", "keep"]) {
			await data.set(key, "x");
		}
		for (const key of ["atd.tokens", "atd.msTokens"]) {
			await tokens.set(key, "x");
		}
		await LocalData.discard(data, tokens);
		expect(await data.get("atd.snapshot")).toBeNull();
		expect(await data.get("atd.msPrefs")).toBeNull();
		expect(await data.get("keep")).toBe("x");
		expect(await tokens.get("atd.tokens")).toBeNull();
		expect(await tokens.get("atd.msTokens")).toBeNull();
	});
});
