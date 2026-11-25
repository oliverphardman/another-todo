import { Image, NativeModules } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DesktopFilePicker } from "../src/attachments/desktop-file-picker";
import { ExpoFilePicker as MacFilePicker } from "../src/attachments/expo-file-picker.macos";
import { DesktopSoundPlayer } from "../src/audio/desktop-sound-player";
import { ExpoSoundPlayer as MacSound } from "../src/audio/expo-sound-player.macos";

const modules = NativeModules as Record<string, unknown>;
const images = Image as unknown as { resolveAssetSource?: () => { uri: string } | undefined };

afterEach(() => {
	delete modules.AnotherToDoSound;
	delete modules.AnotherToDoFiles;
	delete images.resolveAssetSource;
	vi.restoreAllMocks();
});

describe("desktop completion sound", () => {
	it("plays the bundled sound through the native module", () => {
		const play = vi.fn();
		modules.AnotherToDoSound = { play };
		images.resolveAssetSource = () => ({ uri: "file:///app/complete.mp3" });
		new MacSound().playCompleted();
		expect(play).toHaveBeenCalledWith("file:///app/complete.mp3");
	});

	it("stays quiet without the module or the sound file", () => {
		const play = vi.fn();
		modules.AnotherToDoSound = { play };
		new MacSound().playCompleted();
		images.resolveAssetSource = () => undefined;
		new MacSound().playCompleted();
		expect(play).not.toHaveBeenCalled();
		expect(() =>
			new DesktopSoundPlayer(undefined, () => "file:///a").playCompleted(),
		).not.toThrow();
	});
});

describe("desktop file picker", () => {
	it("turns the chosen file into an upload", async () => {
		modules.AnotherToDoFiles = {
			pick: async () => ({
				uri: "file:///tmp/report.pdf",
				name: "report.pdf",
				size: 12,
				contentType: "application/pdf",
			}),
		};
		expect(await new MacFilePicker().pick()).toEqual({
			name: "report.pdf",
			size: 12,
			contentType: "application/pdf",
			body: { uri: "file:///tmp/report.pdf", name: "report.pdf", type: "application/pdf" },
		});
	});

	it("returns nothing when cancelled or without the module", async () => {
		expect(await new DesktopFilePicker({ pick: async () => null }).pick()).toBeNull();
		expect(await new DesktopFilePicker(undefined).pick()).toBeNull();
		expect(await new MacFilePicker().pick()).toBeNull();
	});
});
