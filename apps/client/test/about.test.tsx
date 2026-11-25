import { act, cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NativeModules } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppConfigReader } from "../src/config/app-config";
import { LICENSE_TEXT, REPOSITORY_URL } from "../src/config/project";
import { ServerInfoLoader } from "../src/config/server-info";
import { ServerSession } from "../src/config/server-session";
import { ServerSettings } from "../src/config/server-settings";
import { I18nProvider } from "../src/i18n/i18n-context";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { About, type AboutDetails } from "../src/ui/about";
import { aboutBridge } from "../src/ui/about-bridge";
import { AboutSync } from "../src/ui/about-sync";
import { DesktopAboutBridge } from "../src/ui/desktop-about-bridge";

const original = About.bridge;

afterEach(() => {
	cleanup();
	About.bridge = original;
});

describe("the About details", () => {
	it("quotes the repository license in full", () => {
		const license = readFileSync(resolve(process.cwd(), "../../LICENSE"), "utf8");
		const words = (text: string) => text.split(/\s+/).filter(Boolean);
		expect(words(LICENSE_TEXT)).toEqual(words(license));
	});

	it("follows the configured server, with the source and license", async () => {
		const shown: AboutDetails[] = [];
		About.bridge = { describe: (details) => void shown.push(details) };
		let up = true;
		const session = new ServerSession(
			AppConfigReader.read({}, undefined, undefined),
			new ServerSettings(new MemoryKeyValueStore(), null, async () => undefined),
			new ServerInfoLoader(
				async () =>
					new Response(JSON.stringify({ authentication: "none" }), { status: up ? 200 : 500 }),
			),
		);
		render(
			<I18nProvider>
				<AboutSync session={session} />
			</I18nProvider>,
		);
		expect(shown.at(-1)).toEqual({
			serverLabel: "Server",
			serverUrl: null,
			sourceLabel: "Source code",
			sourceUrl: REPOSITORY_URL,
			license: LICENSE_TEXT,
		});
		await act(async () => session.connect("todo.example.com"));
		expect(shown.at(-1)!.serverUrl).toBe("https://todo.example.com");
		up = false;
		await act(async () => session.connect("other.example.com"));
		expect(shown.at(-1)!.serverUrl).toBe("https://other.example.com");
		await act(async () => session.change());
		expect(shown.at(-1)!.serverUrl).toBeNull();
	});

	it("reaches the native panel only on macOS", async () => {
		const setAbout = vi.fn();
		const details = { serverUrl: null } as AboutDetails;
		new DesktopAboutBridge({ setAbout }).describe(details);
		expect(setAbout).toHaveBeenCalledWith(details);
		expect(() => new DesktopAboutBridge(undefined).describe(details)).not.toThrow();
		expect(() => new DesktopAboutBridge({}).describe(details)).not.toThrow();
		expect(aboutBridge.describe(details)).toBeUndefined();
		(NativeModules as Record<string, unknown>).AnotherToDoMenu = { setAbout };
		const mac = await import("../src/ui/about-bridge.macos");
		mac.aboutBridge.describe(details);
		expect(setAbout).toHaveBeenCalledTimes(2);
		delete (NativeModules as Record<string, unknown>).AnotherToDoMenu;
	});
});
