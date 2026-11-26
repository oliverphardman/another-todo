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

describe("the mobile log out button", () => {
	it("sits in the sidebar header and returns to the server address", async () => {
		const controls = server(false);
		const app = await start({ server: controls, config: { authentication: "none" } });
		const sidebar = within(screen.getByLabelText("Lists"));
		await act(async () => {
			fireEvent.click(sidebar.getByLabelText("Log Out"));
		});
		await vi.waitFor(() => expect(controls.logOut).toHaveBeenCalledTimes(1));
		expect(app.container.auth.get()).toBe("signedOut");
	});

	it("is left out where there is nothing to leave", async () => {
		await start({ server: server(true), config: { authentication: "none" } });
		expect(screen.getByLabelText("Lists")).toBeTruthy();
		expect(screen.queryByLabelText("Log Out")).toBeNull();
	});

	it("is replaced on the web by signing out, which a server without accounts has no use for", async () => {
		Platform.OS = "web";
		await start({ config: { authentication: "none" } });
		expect(screen.queryByLabelText("Sign out")).toBeNull();
		expect(screen.queryByLabelText("Log Out")).toBeNull();
	});

	it("is left to the menu bar on macOS", async () => {
		Platform.OS = "macos";
		await start({ server: server(false) });
		expect(screen.queryByLabelText("Sign out")).toBeNull();
		expect(screen.queryByLabelText("Log Out")).toBeNull();
	});
});
