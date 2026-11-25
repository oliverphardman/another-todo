import { NativeModules } from "react-native";
import { DesktopAboutBridge, type DesktopAboutModule } from "./desktop-about-bridge";

export const aboutBridge = new DesktopAboutBridge(
	NativeModules.AnotherToDoMenu as DesktopAboutModule | undefined,
);
