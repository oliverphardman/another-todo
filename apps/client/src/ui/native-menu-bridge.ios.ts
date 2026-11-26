import { ActionSheetIOS } from "react-native";
import { ActionSheetMenuBridge } from "./action-sheet-menu-bridge";

export const nativeMenuBridge = new ActionSheetMenuBridge({
	showActionSheetWithOptions: (options, chosen) =>
		ActionSheetIOS.showActionSheetWithOptions(options, chosen),
});
