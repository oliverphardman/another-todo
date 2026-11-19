import { beforeEach, describe, expect, it, vi } from "vitest";

const audio = vi.hoisted(() => ({
	player: { seekTo: vi.fn(), play: vi.fn() },
	createAudioPlayer: vi.fn(),
}));

vi.mock("expo-audio", () => ({ createAudioPlayer: audio.createAudioPlayer }));

import { ExpoSoundPlayer } from "../src/audio/expo-sound-player";
import { SilentSoundPlayer } from "../src/audio/sound-player";

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("ExpoSoundPlayer", () => {
	beforeEach(() => {
		audio.player.seekTo.mockReset().mockResolvedValue(undefined);
		audio.player.play.mockReset();
		audio.createAudioPlayer.mockReset().mockReturnValue(audio.player);
	});

	it("creates the player lazily and plays from the start every time", async () => {
		const sounds = new ExpoSoundPlayer();
		expect(audio.createAudioPlayer).not.toHaveBeenCalled();
		sounds.playCompleted();
		await settle();
		sounds.playCompleted();
		await settle();
		expect(audio.createAudioPlayer).toHaveBeenCalledTimes(1);
		expect(audio.createAudioPlayer.mock.calls[0]![0]).toBeDefined();
		expect(audio.player.seekTo).toHaveBeenCalledWith(0);
		expect(audio.player.play).toHaveBeenCalledTimes(2);
	});

	it("never lets a playback failure reach the user", async () => {
		audio.player.seekTo.mockRejectedValue(new Error("no audio device"));
		const sounds = new ExpoSoundPlayer();
		expect(() => sounds.playCompleted()).not.toThrow();
		await settle();
		expect(audio.player.play).not.toHaveBeenCalled();
	});

	it("retries creating the player after it failed to load", async () => {
		audio.createAudioPlayer.mockImplementationOnce(() => {
			throw new Error("cannot load");
		});
		const sounds = new ExpoSoundPlayer();
		expect(() => sounds.playCompleted()).not.toThrow();
		sounds.playCompleted();
		await settle();
		expect(audio.createAudioPlayer).toHaveBeenCalledTimes(2);
		expect(audio.player.play).toHaveBeenCalledTimes(1);
	});
});

describe("SilentSoundPlayer", () => {
	it("does nothing", () => {
		expect(() => new SilentSoundPlayer().playCompleted()).not.toThrow();
	});
});
