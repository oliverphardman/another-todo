import { beforeEach, describe, expect, it, vi } from "vitest";
import { Platform } from "react-native";

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
	it("prints the html document natively off the web", async () => {
		print.printAsync.mockResolvedValue(undefined);
		Platform.OS = "ios";
		await new ExpoListPrinter().print("<p>hi</p>");
		Platform.OS = "web";
		expect(print.printAsync).toHaveBeenCalledWith({ html: "<p>hi</p>" });
	});

	it("prints only the list in a hidden frame on the web and removes the frame afterwards", async () => {
		const printed = vi.fn();
		const appended = document.body.appendChild.bind(document.body);
		vi.spyOn(document.body, "appendChild").mockImplementation(((node: HTMLIFrameElement) => {
			appended(node);
			Object.defineProperty(node, "contentWindow", {
				value: {
					focus: () => undefined,
					print: () => {
						printed(node.srcdoc);
						(node.contentWindow as unknown as { onafterprint: () => void }).onafterprint();
					},
					onafterprint: null,
				},
			});
			node.onload!(new Event("load"));
			return node;
		}) as never);
		await new ExpoListPrinter().print("<h1>Groceries</h1>");
		expect(printed).toHaveBeenCalledWith("<h1>Groceries</h1>");
		expect(document.querySelector("iframe")).toBeNull();
		vi.restoreAllMocks();
	});
});
