import type { NativeMenuBridge } from "./native-menu";

export const nativeMenuBridge: NativeMenuBridge = {
	isAvailable: () => false,
	show: async () => null,
};
