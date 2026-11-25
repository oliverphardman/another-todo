import { NativeModules } from "react-native";
import { DesktopMenuBarBridge, type DesktopMenuBarModule } from "./desktop-menu-bar-bridge";

export const menuBarBridge = new DesktopMenuBarBridge(
	NativeModules.AnotherToDoMenu as DesktopMenuBarModule | undefined,
);
