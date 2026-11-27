import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, render, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/i18n/i18n-context";
import { DesktopSettingsBridge } from "../src/ui/desktop-settings-bridge";
import {
	NativeSettings,
	type NativeSettingsBridge,
	type NativeSettingsChange,
	type NativeSettingsModel,
	type NativeSettingsRow,
} from "../src/ui/native-settings";
import { nativeSettingsBridge as defaultBridge } from "../src/ui/native-settings-bridge";
import { nativeSettingsBridge as macBridge } from "../src/ui/native-settings-bridge.macos";
import { NativeSettingsPlaceholder } from "../src/ui/native-settings-sync";
import { microsoftAccessToken } from "./support/fake-microsoft";
import { renderApp } from "./support/render-app";

class FakeWindow implements NativeSettingsBridge {
	models: NativeSettingsModel[] = [];
	private waiting: ((change: NativeSettingsChange | null) => void) | null = null;

	isAvailable(): boolean {
		return true;
	}

	show(model: NativeSettingsModel): void {
		this.models.push(model);
	}

	nextChange(): Promise<NativeSettingsChange | null> {
		return new Promise((resolve) => (this.waiting = resolve));
	}

	async change(key: string, value: string): Promise<void> {
		await act(async () => this.waiting!({ key, value }));
	}

	async nothing(): Promise<void> {
		await act(async () => this.waiting!(null));
	}

	get shown(): NativeSettingsModel {
		return this.models.at(-1)!;
	}

	row(key: string): NativeSettingsRow {
		return this.shown.sections.flatMap((section) => section.rows).find((row) => row.key === key)!;
	}
}

const originalBridge = NativeSettings.bridge;
const originalPlatform = Platform.OS;
let native: FakeWindow;
let stop: (() => void) | undefined;

beforeEach(() => {
	Platform.OS = "macos";
	native = new FakeWindow();
	NativeSettings.bridge = native;
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	NativeSettings.bridge = originalBridge;
	Platform.OS = originalPlatform;
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	await act(async () => undefined);
	return app;
}

describe("the macOS settings window", () => {
	it("describes every section in order, ending with logging out", async () => {
		await start();
		expect(native.shown.sections.map((section) => section.title)).toEqual([
			"Appearance",
			"Microsoft To Do",
			"Server",
			"Lists",
			"My Day",
			"",
		]);
		expect(native.row("preview")).toMatchObject({
			label: "Example task",
			detail: "Tasks · Today",
			height: 52,
		});
		expect(native.row("serverUrl")).toMatchObject({
			value: "https://api.test",
			enabled: false,
		});
		expect(native.row("microsoft.note").label).toContain("Sign out then sign in");
		expect(native.row("microsoft.receive")).toMatchObject({ value: "false", enabled: false });
		expect(native.shown.sections.at(-1)!.rows).toEqual([
			{ kind: "button", key: "account", label: "Log Out" },
		]);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("applies what is changed there and shows the result", async () => {
		const app = await start();
		const settings = app.container.settings;
		await native.change("rowStyle", "compact");
		expect(native.row("preview").height).toBe(44);
		await native.change("addTaskPosition", "bottom");
		await native.change("list.planned", "false");
		await native.change("myDay.yesterday", "true");
		await native.change("myDay.dueToday", "false");
		expect(settings.get()).toMatchObject({
			rowStyle: "compact",
			addTaskPosition: "bottom",
			lists: { planned: false },
			myDay: { yesterday: true, dueToday: false },
		});
		expect(native.row("list.planned").value).toBe("false");
		await native.change("rowStyle", "cozy");
		await native.change("addTaskPosition", "top");
		expect(settings.get()).toMatchObject({ rowStyle: "cozy", addTaskPosition: "top" });
	});

	it("ignores disabled, read only and unknown rows", async () => {
		const app = await start();
		const accept = vi.spyOn(app.container.microsoft, "accept");
		await native.change("microsoft.receive", "true");
		await native.change("serverUrl", "https://elsewhere.test");
		await native.change("nothing", "true");
		await native.nothing();
		expect(accept).not.toHaveBeenCalled();
		expect(native.row("serverUrl").value).toBe("https://api.test");
	});

	it("controls Microsoft syncing for a Microsoft account", async () => {
		const app = await start({ accessToken: microsoftAccessToken() });
		await vi.waitFor(() => expect(native.row("microsoft.receive").enabled).toBe(true));
		expect(native.row("microsoft.note")).toBeUndefined();
		await native.change("microsoft.send", "true");
		await vi.waitFor(() => expect(native.row("microsoft.send").value).toBe("true"));
		await native.change("microsoft.receive", "true");
		expect(app.container.settings.get().microsoft).toMatchObject({ receive: true, send: true });
		await native.change("microsoft.interval", "30");
		await native.change("microsoft.interval", "soon");
		expect(native.row("microsoft.interval").value).toBe("30");
	});

	it("logs out, then asks to sign in again", async () => {
		const logOut = vi.fn(async () => undefined);
		const app = await start({
			server: { enforced: false, change: async () => undefined, logOut },
		});
		await native.change("account", "");
		await vi.waitFor(() => expect(logOut).toHaveBeenCalledTimes(1));
		expect(app.container.auth.get()).toBe("signedOut");
		expect(native.shown.sections[0]!.rows[0]!.label).toBe("Sign in to change settings");
	});

	it("has no account button where there is nothing to leave", async () => {
		await start({
			config: { authentication: "none" },
			server: { enforced: true, change: async () => undefined, logOut: async () => undefined },
		});
		expect(native.shown.sections.map((section) => section.key)).not.toContain("account");
	});

	it("stops listening if the native side fails", async () => {
		const failing = vi.fn(async () => {
			throw new Error("gone");
		});
		native.nextChange = failing;
		await start();
		expect(failing).toHaveBeenCalledTimes(1);
	});

	it("says why it is empty before anyone signs in", () => {
		render(
			<I18nProvider>
				<NativeSettingsPlaceholder />
			</I18nProvider>,
		);
		expect(native.shown.sections[0]!.rows[0]!.label).toBe("Sign in to change settings");
	});
});

describe("settings bridges", () => {
	it("are unavailable away from macOS or without the native module", async () => {
		expect(defaultBridge.isAvailable()).toBe(false);
		defaultBridge.show({ sections: [] });
		expect(await defaultBridge.nextChange()).toBeNull();
		expect(macBridge.isAvailable()).toBe(false);
		expect(new DesktopSettingsBridge(null).isAvailable()).toBe(false);
	});

	it("pass the window and its changes through the native module", async () => {
		const show = vi.fn();
		const bridge = new DesktopSettingsBridge({
			show,
			nextChange: async () => ({ key: "k", value: "v" }),
		});
		expect(bridge.isAvailable()).toBe(true);
		bridge.show({ sections: [] });
		expect(show).toHaveBeenCalledWith('{"sections":[]}');
		expect(await bridge.nextChange()).toEqual({ key: "k", value: "v" });
	});

	it("agree on names between the module and the SwiftUI window", () => {
		const read = (path: string) => readFileSync(resolve("macos", path), "utf8");
		const module = read("AnotherToDoSystem/AnotherToDoSettings.mm");
		const view = read("AnotherToDo-macOS/SettingsView.swift");
		for (const name of ["ATDSettingsModel", "ATDSettingsChange"]) {
			expect(module).toContain(`@"${name}"`);
			expect(view).toContain(`Notification.Name("${name}")`);
		}
		expect(read("AnotherToDo-macOS/AppDelegate.swift")).toContain(
			"Settings {\n      SettingsView()",
		);
		expect(read("AnotherToDo.xcodeproj/project.pbxproj")).toContain(
			"SettingsView.swift in Sources",
		);
	});
});
