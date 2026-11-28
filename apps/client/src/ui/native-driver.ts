import { Platform } from "react-native";

const SUPPORTED: readonly string[] = ["ios", "android"];

export function usesNativeDriver(): boolean {
	return SUPPORTED.includes(Platform.OS);
}
