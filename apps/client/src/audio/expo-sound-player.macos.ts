import { Image, NativeModules } from "react-native";
import completedSound from "../../res/complete.mp3";
import { DesktopSoundPlayer, type DesktopSoundModule } from "./desktop-sound-player";

export class ExpoSoundPlayer extends DesktopSoundPlayer {
	constructor() {
		super(
			NativeModules.AnotherToDoSound as DesktopSoundModule | undefined,
			() => Image.resolveAssetSource?.(completedSound)?.uri,
		);
	}
}
