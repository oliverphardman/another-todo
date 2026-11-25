import type { SoundPlayer } from "./sound-player";

export interface DesktopSoundModule {
	play(uri: string): void;
}

export class DesktopSoundPlayer implements SoundPlayer {
	constructor(
		private readonly module: DesktopSoundModule | null | undefined,
		private readonly completedUri: () => string | undefined,
	) {}

	playCompleted(): void {
		const uri = this.completedUri();
		if (uri !== undefined) {
			this.module?.play(uri);
		}
	}
}
