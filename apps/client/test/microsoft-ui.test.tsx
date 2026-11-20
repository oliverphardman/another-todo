import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { microsoftAccessToken } from "./support/fake-microsoft";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	return app;
}

const menuItem = (label: string) => screen.getByLabelText(label, { selector: "[role=menuitem]" });

describe("Microsoft To Do consent", () => {
	it("asks Microsoft accounts whether to sync and connects when they agree", async () => {
		const app = await start({ accessToken: microsoftAccessToken() });
		const dialog = await screen.findByRole("alert");
		expect(within(dialog).getByText("Sync with Microsoft To Do?")).toBeTruthy();
		expect(within(dialog).getByLabelText("Not now")).toBeTruthy();
		fireEvent.click(within(dialog).getByLabelText("Sync"));
		await waitFor(() => expect(app.container.microsoft.get()).toBe("connected"));
		expect(app.microsoftAuthorizer.authorizeCalls).toBe(1);
		await waitFor(() =>
			expect(app.graphRequests.some((request) => request.includes("/me/todo/lists"))).toBe(true),
		);
	});

	it("does not connect when the user says not now, and does not ask again", async () => {
		const app = await start({ accessToken: microsoftAccessToken() });
		fireEvent.click(within(await screen.findByRole("alert")).getByLabelText("Not now"));
		await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
		expect(app.microsoftAuthorizer.authorizeCalls).toBe(0);
		expect(app.container.microsoft.get()).toBe("idle");
	});

	it("never asks accounts that did not sign in with Microsoft", async () => {
		await start();
		await act(async () => undefined);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("offers to connect or disconnect from the empty-space menu", async () => {
		const app = await start();
		fireEvent.contextMenu(screen.getByLabelText("Empty space in the lists"));
		fireEvent.click(menuItem("Sync with Microsoft To Do…"));
		await waitFor(() => expect(app.container.microsoft.get()).toBe("connected"));
		fireEvent.contextMenu(screen.getByLabelText("Empty space in the lists"));
		expect(
			screen.queryByLabelText("Sync with Microsoft To Do…", { selector: "[role=menuitem]" }),
		).toBeNull();
		fireEvent.click(menuItem("Stop syncing with Microsoft To Do"));
		await waitFor(() => expect(app.container.microsoft.get()).toBe("idle"));
	});

	it("offers nothing when Microsoft sync is unavailable on the platform or the question is still open", async () => {
		const unavailable = await start({ microsoftAvailable: false });
		expect(unavailable.container.microsoft.get()).toBe("unavailable");
		fireEvent.contextMenu(screen.getByLabelText("Empty space in the lists"));
		expect(screen.getByRole("menu", { name: "Sidebar actions" })).toBeTruthy();
		expect(
			screen.queryByLabelText("Sync with Microsoft To Do…", { selector: "[role=menuitem]" }),
		).toBeNull();
		expect(
			screen.queryByLabelText("Stop syncing with Microsoft To Do", { selector: "[role=menuitem]" }),
		).toBeNull();
		cleanup();
		stop?.();
		await start({ accessToken: microsoftAccessToken() });
		await screen.findByRole("alert");
		fireEvent.contextMenu(screen.getByLabelText("Empty space in the lists"));
		expect(
			screen.queryByLabelText("Stop syncing with Microsoft To Do", { selector: "[role=menuitem]" }),
		).toBeNull();
	});
});
