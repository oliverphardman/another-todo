import { AsyncStorageKeyValueStore } from "./async-storage-key-value-store";
import type { KeyValueStore } from "./key-value-store";
import { SecureStoreKeyValueStore } from "./secure-store-key-value-store";

export function createTokenStore(platform: string): KeyValueStore {
	return platform === "web" ? new AsyncStorageKeyValueStore() : new SecureStoreKeyValueStore();
}
