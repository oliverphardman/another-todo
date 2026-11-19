import * as SecureStore from "expo-secure-store";
import type { KeyValueStore } from "./key-value-store";

export class SecureStoreKeyValueStore implements KeyValueStore {
	get(key: string): Promise<string | null> {
		return SecureStore.getItemAsync(key);
	}

	set(key: string, value: string): Promise<void> {
		return SecureStore.setItemAsync(key, value);
	}

	remove(key: string): Promise<void> {
		return SecureStore.deleteItemAsync(key);
	}
}
