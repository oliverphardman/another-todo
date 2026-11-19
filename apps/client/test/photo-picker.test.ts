import { beforeEach, describe, expect, it, vi } from "vitest";

const picker = vi.hoisted(() => ({ launchImageLibraryAsync: vi.fn() }));
const print = vi.hoisted(() => ({ printAsync: vi.fn() }));

vi.mock("expo-image-picker", () => picker);
vi.mock("expo-print", () => print);

import { ExpoPhotoPicker } from "../src/photos/expo-photo-picker";
import { ExpoListPrinter } from "../src/print/expo-list-printer";

describe("ExpoPhotoPicker", () => {
	beforeEach(() => {
		picker.launchImageLibraryAsync.mockReset();
	});

	it("returns null when the user cancels", async () => {
		picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null });
		expect(await new ExpoPhotoPicker().pick()).toBeNull();
		expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith({
			mediaTypes: ["images"],
			allowsMultipleSelection: false,
			quality: 1,
		});
	});

	it("uses the browser's file on the web", async () => {
		const file = new File(["abcd"], "sunset.jpg", { type: "image/jpeg" });
		picker.launchImageLibraryAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "blob:x", mimeType: "image/jpeg", fileName: "sunset.jpg", file }],
		});
		expect(await new ExpoPhotoPicker().pick()).toEqual({
			name: "sunset.jpg",
			contentType: "image/jpeg",
			size: 4,
			body: file,
		});
	});

	it("describes the file for native uploads, with defaults for missing details", async () => {
		picker.launchImageLibraryAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file:///a.jpg", mimeType: "image/png", fileName: "a.png", fileSize: 77 }],
		});
		expect(await new ExpoPhotoPicker().pick()).toEqual({
			name: "a.png",
			contentType: "image/png",
			size: 77,
			body: { uri: "file:///a.jpg", name: "a.png", type: "image/png" },
		});
		picker.launchImageLibraryAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file:///b" }],
		});
		expect(await new ExpoPhotoPicker().pick()).toEqual({
			name: "photo",
			contentType: "image/jpeg",
			size: 0,
			body: { uri: "file:///b", name: "photo", type: "image/jpeg" },
		});
	});
});

describe("ExpoListPrinter", () => {
	it("prints the html document", async () => {
		print.printAsync.mockResolvedValue(undefined);
		await new ExpoListPrinter().print("<p>hi</p>");
		expect(print.printAsync).toHaveBeenCalledWith({ html: "<p>hi</p>" });
	});
});
