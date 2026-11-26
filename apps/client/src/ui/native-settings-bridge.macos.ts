import { NativeModules } from "react-native";
import { DesktopSettingsBridge, type DesktopSettingsModule } from "./desktop-settings-bridge";

export const nativeSettingsBridge = new DesktopSettingsBridge(
	NativeModules.AnotherToDoSettings as DesktopSettingsModule | undefined,
);
