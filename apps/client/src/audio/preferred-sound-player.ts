import type { AppSettings } from "../state/app-settings";
import type { SoundPlayer } from "./sound-player";

export class PreferredSoundPlayer implements SoundPlayer {
	constructor(
		private readonly player: SoundPlayer,
		private readonly settings: AppSettings,
	) {}

	playCompleted(): void {
		if (this.settings.get().completionSound) {
			this.player.playCompleted();
		}
	}
}
