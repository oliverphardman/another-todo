import { NativeModules } from "react-native";
import { DesktopFilePicker, type DesktopFileModule } from "./desktop-file-picker";

export class ExpoFilePicker extends DesktopFilePicker {
	constructor() {
		super(NativeModules.AnotherToDoFiles as DesktopFileModule | undefined);
	}
}
