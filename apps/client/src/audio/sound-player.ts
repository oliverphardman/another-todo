export interface SoundPlayer {
	playCompleted(): void;
}

export class SilentSoundPlayer implements SoundPlayer {
	playCompleted(): void {}
}
