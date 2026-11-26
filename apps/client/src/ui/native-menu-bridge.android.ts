import { requireOptionalNativeModule } from "expo";
import { AndroidMenuBridge, type AndroidMenuModule } from "./android-menu-bridge";

export const nativeMenuBridge = new AndroidMenuBridge(
	requireOptionalNativeModule<AndroidMenuModule>("AnotherToDoMenu"),
);
