import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import completedSound from "../../res/complete.mp3";
import type { SoundPlayer } from "./sound-player";

export class ExpoSoundPlayer implements SoundPlayer {
	private player: AudioPlayer | null = null;

	playCompleted(): void {
		try {
			const player = (this.player ??= createAudioPlayer(completedSound));
			player
				.seekTo(0)
				.then(() => player.play())
				.catch(() => undefined);
		} catch {
			this.player = null;
		}
	}
}
