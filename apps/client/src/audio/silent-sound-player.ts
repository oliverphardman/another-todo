import type { SoundPlayer } from "./sound-player";

export class SilentSoundPlayer implements SoundPlayer {
	playCompleted(): void {
		return;
	}
}
