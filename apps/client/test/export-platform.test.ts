import { readFileSync } from "node:fs";
import { NativeModules } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BrowserFileSaver, type SavePickerHost } from "../src/export/browser-file-saver";
import { createExportPlatform as android } from "../src/export/export-platform.android";
import { createExportPlatform as ios } from "../src/export/export-platform.ios";
import { createExportPlatform as mac } from "../src/export/export-platform.macos";
import { createExportPlatform as web } from "../src/export/export-platform";
import { createExportPlatform as windows } from "../src/export/export-platform.windows";
import type { SaveRequest } from "../src/export/file-saver";
import { ModuleFileSaver } from "../src/export/module-file-saver";
import { I18n } from "../src/i18n/i18n";

const mobile = vi.hoisted(() => ({
	module: null as { save: () => Promise<boolean> } | null,
	printed: [] as unknown[],
}));

vi.mock("expo", () => ({ requireOptionalNativeModule: () => mobile.module }));
vi.mock("expo-print", () => ({
	printToFileAsync: async (options: unknown) => {
		mobile.printed.push(options);
		return { uri: "file:///a.pdf", base64: "JVBERg==" };
	},
}));

const modules = NativeModules as Record<string, unknown>;
const BOOK = { title: "T", lists: [] };

const request = (content = async () => new Uint8Array([104, 105])): SaveRequest => ({
	name: "Home.csv",
	extension: "csv",
	contentType: "text/csv",
	content,
});

afterEach(() => {
	delete modules.AnotherToDoExport;
	mobile.module = null;
	vi.restoreAllMocks();
	vi.useRealTimers();
});

function picker(failWrite = false) {
	const written: Blob[] = [];
	const writable = {
		write: vi.fn(async (data: Blob) => {
			if (failWrite) {
				throw new Error("full");
			}
			written.push(data);
		}),
		close: vi.fn(async () => undefined),
		abort: vi.fn(async () => undefined),
	};
	const show = vi.fn(async () => ({ createWritable: async () => writable }));
	return { written, writable, show, host: { showSaveFilePicker: show } };
}

describe("saving in a browser", () => {
	it("writes to the file chosen in the system save dialog", async () => {
		const { host, show, writable, written } = picker();
		expect(await new BrowserFileSaver(() => host).save(request())).toBe("saved");
		expect(show).toHaveBeenCalledWith({
			suggestedName: "Home.csv",
			types: [{ accept: { "text/csv": [".csv"] } }],
		});
		expect(written[0]!.size).toBe(2);
		expect(writable.close).toHaveBeenCalled();
	});

	it("does nothing when the dialog is cancelled", async () => {
		const content = vi.fn(async () => new Uint8Array());
		const host: SavePickerHost = {
			showSaveFilePicker: async () => {
				throw new DOMException("no", "AbortError");
			},
		};
		expect(await new BrowserFileSaver(() => host).save(request(content))).toBe("cancelled");
		expect(content).not.toHaveBeenCalled();
	});

	it("discards a file that could not be written", async () => {
		const { host, writable } = picker(true);
		await expect(new BrowserFileSaver(() => host).save(request())).rejects.toThrow("full");
		expect(writable.abort).toHaveBeenCalled();
		expect(writable.close).not.toHaveBeenCalled();
	});

	it("downloads where there is no dialog or it is not allowed", async () => {
		vi.useFakeTimers();
		const create = vi.fn(() => "blob:file");
		const revoke = vi.fn();
		Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
		const clicked: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			clicked.push(`${this.download} ${this.href}`);
		});
		const refused: SavePickerHost = {
			showSaveFilePicker: async () => {
				throw new DOMException("no", "SecurityError");
			},
		};
		expect(await new BrowserFileSaver(() => ({})).save(request())).toBe("saved");
		expect(await new BrowserFileSaver(() => refused).save(request())).toBe("saved");
		expect(clicked).toEqual(["Home.csv blob:file", "Home.csv blob:file"]);
		expect(document.querySelector("a")).toBeNull();
		vi.advanceTimersByTime(60_000);
		expect(revoke).toHaveBeenCalledTimes(2);
	});

	it("uses the window by default", async () => {
		const { host } = picker();
		Object.assign(window, host);
		const saver = new BrowserFileSaver();
		expect(saver.available).toBe(true);
		expect(await saver.save(request())).toBe("saved");
		delete (window as SavePickerHost).showSaveFilePicker;
	});
});

describe("saving through a native module", () => {
	it("passes the contents to the system dialog and reports the outcome", async () => {
		const save = vi.fn(async () => true);
		expect(await new ModuleFileSaver({ save }).save(request())).toBe("saved");
		expect(save).toHaveBeenCalledWith("Home.csv", "text/csv", "aGk=");
		save.mockResolvedValue(false);
		expect(await new ModuleFileSaver({ save }).save(request())).toBe("cancelled");
	});

	it("is unavailable without the module", () => {
		expect(new ModuleFileSaver(null).available).toBe(false);
		expect(new ModuleFileSaver(undefined).available).toBe(false);
	});
});

describe("export platforms", () => {
	it("uses the browser on the web", () => {
		expect(web().saver.available).toBe(true);
		expect(web().pdf).not.toBeNull();
	});

	it("uses the native module and print service on phones", async () => {
		expect(ios().saver.available).toBe(false);
		mobile.module = { save: async () => true };
		const platform = android();
		expect(platform.saver.available).toBe(true);
		expect(new TextDecoder().decode(await platform.pdf.render(BOOK, new I18n()))).toBe("%PDF");
		expect(mobile.printed[0]).toMatchObject({ base64: true });
	});

	it.each([
		["macOS", mac],
		["Windows", windows],
	])("saves and renders through the %s module", async (_, create) => {
		expect(create().saver.available).toBe(false);
		const renderPdf = vi.fn(async () => "JVBERg==");
		modules.AnotherToDoExport = { save: async () => true, renderPdf };
		const platform = create();
		expect(platform.saver.available).toBe(true);
		await platform.pdf.render(BOOK, new I18n());
		expect(renderPdf).toHaveBeenCalledWith(expect.stringContaining("<title>T</title>"));
	});
});

describe("native export modules", () => {
	const read = (path: string) => readFileSync(path, "utf8");

	it("share one name and method on every platform", () => {
		expect(read("macos/AnotherToDoSystem/AnotherToDoExport.mm")).toContain(
			"RCT_EXPORT_METHOD(save:(NSString *)name",
		);
		expect(read("macos/AnotherToDoSystem/AnotherToDoExport.mm")).toContain(
			"RCT_EXPORT_METHOD(renderPdf:",
		);
		expect(read("modules/another-todo-export/ios/AnotherToDoExportModule.swift")).toContain(
			'Name("AnotherToDoExport")',
		);
		expect(
			read(
				"modules/another-todo-export/android/src/main/java/dev/oliverhardman/anothertodo/export/AnotherToDoExportModule.kt",
			),
		).toContain('Name("AnotherToDoExport")');
		expect(read("windows/AnotherToDo/NativeExport.h")).toContain(
			'REACT_MODULE(AnotherToDoExport, L"AnotherToDoExport")',
		);
		expect(read("windows/AnotherToDo/AnotherToDo.cpp")).toContain('#include "NativeExport.h"');
	});

	it("renders PDFs with the WebView2 that ships with the Windows app SDK", () => {
		expect(read("windows/AnotherToDo/NativeExport.h")).toContain(
			'REACT_METHOD(RenderPdf, L"renderPdf")',
		);
		expect(read("windows/AnotherToDo/NativePdf.h")).toContain("IsScriptEnabled(false)");
		const project = read("windows/AnotherToDo/AnotherToDo.vcxproj");
		expect(project).toContain("<WebView2UseWinRT>true</WebView2UseWinRT>");
		expect(project).toContain('Include="Microsoft.Web.WebView2" Version="1.0.3179.45"');
	});

	it("may write the file the user chose on macOS", () => {
		expect(read("macos/AnotherToDo-macOS/AnotherToDo.entitlements")).toContain(
			"com.apple.security.files.user-selected.read-write",
		);
		expect(read("macos/AnotherToDoSystem/AnotherToDoSystem.podspec")).toContain('"WebKit"');
	});
});
