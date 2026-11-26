import type { NativeSettingsBridge } from "./native-settings";

export const nativeSettingsBridge: NativeSettingsBridge = {
	isAvailable: () => false,
	show: () => undefined,
	nextChange: async () => null,
};
