import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "./key-value-store";

export class AsyncStorageKeyValueStore implements KeyValueStore {
	get(key: string): Promise<string | null> {
		return AsyncStorage.getItem(key);
	}

	set(key: string, value: string): Promise<void> {
		return AsyncStorage.setItem(key, value);
	}

	remove(key: string): Promise<void> {
		return AsyncStorage.removeItem(key);
	}
}
