import { NativeModules } from "react-native";
import { DesktopMenuBridge, type DesktopMenuModule } from "./desktop-menu-bridge";

export const nativeMenuBridge = new DesktopMenuBridge(
	NativeModules.AnotherToDoMenu as DesktopMenuModule | undefined,
);
