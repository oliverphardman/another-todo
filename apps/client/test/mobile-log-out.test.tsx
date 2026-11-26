import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
let stop: (() => void) | undefined;

beforeEach(() => {
	Platform.OS = "ios";
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
});

const server = (enforced: boolean) => ({
	enforced,
	change: vi.fn(async () => undefined),
	logOut: vi.fn(async () => undefined),
});

async function start(options: Parameters<typeof renderApp>[0]) {
	const app = await renderApp(options);
	stop = app.stop;
	await act(async () => undefined);
	return app;
}

async function openSettings() {
	await act(async () => {
		fireEvent.click(within(screen.getByLabelText("Lists")).getByLabelText("Settings"));
	});
	return within(screen.getByRole("dialog", { name: "Settings" }));
}

describe("logging out on mobile", () => {
	it("is offered at the bottom of settings and returns to the server address", async () => {
		const controls = server(false);
		const app = await start({ server: controls, config: { authentication: "none" } });
		expect(within(screen.getByLabelText("Lists")).queryByLabelText("Log Out")).toBeNull();
		const settings = await openSettings();
		const buttons = settings.getAllByRole("button");
		expect(buttons.at(-1)!.getAttribute("aria-label")).toBe("Log Out");
		await act(async () => {
			fireEvent.click(settings.getByLabelText("Log Out"));
		});
		await vi.waitFor(() => expect(controls.logOut).toHaveBeenCalledTimes(1));
		expect(app.container.auth.get()).toBe("signedOut");
	});

	it("is left out where there is nothing to leave", async () => {
		await start({ server: server(true), config: { authentication: "none" } });
		const settings = await openSettings();
		expect(settings.queryByLabelText("Log Out")).toBeNull();
	});

	it("is replaced on the web by signing out, which a server without accounts has no use for", async () => {
		Platform.OS = "web";
		await start({ config: { authentication: "none" } });
		const settings = await openSettings();
		expect(settings.queryByLabelText("Sign out")).toBeNull();
		expect(settings.queryByLabelText("Log Out")).toBeNull();
	});

	it("leaves macOS to open settings from the menu bar", async () => {
		Platform.OS = "macos";
		await start({ server: server(false) });
		expect(screen.queryByLabelText("Settings")).toBeNull();
		expect(screen.queryByLabelText("Log Out")).toBeNull();
	});
});
