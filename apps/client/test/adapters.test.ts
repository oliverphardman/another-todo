import { beforeEach, describe, expect, it, vi } from "vitest";

const asyncStorage = vi.hoisted(() => ({
	getItem: vi.fn(async () => "value"),
	setItem: vi.fn(async () => undefined),
	removeItem: vi.fn(async () => undefined),
}));
const secureStore = vi.hoisted(() => ({
	getItemAsync: vi.fn(async () => "secret"),
	setItemAsync: vi.fn(async () => undefined),
	deleteItemAsync: vi.fn(async () => undefined),
}));
const netInfo = vi.hoisted(() => ({
	handler: null as
		null | ((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void),
	unsubscribe: vi.fn(),
	addEventListener: vi.fn(),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({ default: asyncStorage }));
vi.mock("expo-secure-store", () => secureStore);
vi.mock("@react-native-community/netinfo", () => ({ default: netInfo }));

import { NetInfoConnectivity } from "../src/state/connectivity";
import { AsyncStorageKeyValueStore } from "../src/storage/async-storage-key-value-store";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { SecureStoreKeyValueStore } from "../src/storage/secure-store-key-value-store";

describe("storage adapters", () => {
	it("delegates to AsyncStorage", async () => {
		const store = new AsyncStorageKeyValueStore();
		expect(await store.get("k")).toBe("value");
		await store.set("k", "v");
		await store.remove("k");
		expect(asyncStorage.setItem).toHaveBeenCalledWith("k", "v");
		expect(asyncStorage.removeItem).toHaveBeenCalledWith("k");
	});

	it("delegates to SecureStore", async () => {
		const store = new SecureStoreKeyValueStore();
		expect(await store.get("k")).toBe("secret");
		await store.set("k", "v");
		await store.remove("k");
		expect(secureStore.setItemAsync).toHaveBeenCalledWith("k", "v");
		expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("k");
	});

	it("keeps values in memory", async () => {
		const store = new MemoryKeyValueStore();
		expect(await store.get("k")).toBeNull();
		await store.set("k", "v");
		expect(await store.get("k")).toBe("v");
		await store.remove("k");
		expect(await store.get("k")).toBeNull();
	});
});

describe("NetInfoConnectivity", () => {
	beforeEach(() => {
		netInfo.addEventListener.mockReset();
		netInfo.unsubscribe.mockReset();
		netInfo.addEventListener.mockImplementation((handler: typeof netInfo.handler) => {
			netInfo.handler = handler;
			return netInfo.unsubscribe;
		});
	});

	it("reports changes in reachability to every listener", () => {
		const connectivity = new NetInfoConnectivity();
		const first = vi.fn();
		const second = vi.fn();
		connectivity.subscribe(first);
		connectivity.subscribe(second);
		expect(netInfo.addEventListener).toHaveBeenCalledTimes(1);
		expect(connectivity.isOnline()).toBe(true);
		netInfo.handler!({ isConnected: false, isInternetReachable: false });
		expect(connectivity.isOnline()).toBe(false);
		netInfo.handler!({ isConnected: false, isInternetReachable: null });
		expect(first).toHaveBeenCalledTimes(1);
		netInfo.handler!({ isConnected: true, isInternetReachable: false });
		expect(connectivity.isOnline()).toBe(false);
		netInfo.handler!({ isConnected: true, isInternetReachable: null });
		expect(connectivity.isOnline()).toBe(true);
		expect(second).toHaveBeenCalledTimes(2);
	});

	it("stops listening to the system once nobody is subscribed", () => {
		const connectivity = new NetInfoConnectivity();
		const first = connectivity.subscribe(() => undefined);
		const second = connectivity.subscribe(() => undefined);
		first();
		expect(netInfo.unsubscribe).not.toHaveBeenCalled();
		second();
		expect(netInfo.unsubscribe).toHaveBeenCalledTimes(1);
		connectivity.subscribe(() => undefined)();
		expect(netInfo.addEventListener).toHaveBeenCalledTimes(2);
	});
});
