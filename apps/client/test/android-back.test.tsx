import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { BackHandler, Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
const listeners: (() => boolean)[] = [];
let stop: (() => void) | undefined;

beforeEach(() => {
	Platform.OS = "android";
	vi.spyOn(BackHandler, "addEventListener").mockImplementation((_, handler) => {
		const listener = handler as () => boolean;
		listeners.push(listener);
		return { remove: () => void listeners.splice(listeners.indexOf(listener), 1) };
	});
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
	listeners.length = 0;
	vi.restoreAllMocks();
});

function back(): boolean {
	let handled = false;
	act(() => {
		handled = [...listeners].reverse().some((listener) => listener());
	});
	return handled;
}

async function start(width: number) {
	const app = await renderApp({ width });
	stop = app.stop;
	act(() => {
		app.container.store.select("tasks");
		app.container.store.addTask("Milk");
	});
	return app;
}

describe("Android back", () => {
	it.each([400, 1280])(
		"closes the selected task at width %i before leaving the app",
		async (width) => {
			const app = await start(width);
			fireEvent.click(screen.getByLabelText("Open Milk"));
			expect(back()).toBe(true);
			expect(app.container.store.selectedTask).toBeNull();
			expect(back()).toBe(false);
		},
	);

	it("closes the lists drawer", async () => {
		await start(400);
		fireEvent.click(screen.getByLabelText("Show lists"));
		expect(back()).toBe(true);
		expect(back()).toBe(false);
	});

	it("steps back through an open menu, then closes it", async () => {
		await start(1280);
		fireEvent.contextMenu(screen.getByLabelText("Open Milk"));
		fireEvent.click(screen.getByLabelText("Move Task to…", { selector: "[role=menuitem]" }));
		expect(back()).toBe(true);
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(back()).toBe(true);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("cancels a confirmation", async () => {
		await start(1280);
		fireEvent.click(screen.getByLabelText("Open Milk"));
		fireEvent.click(screen.getByLabelText("Delete task"));
		expect(await screen.findByRole("alert")).toBeTruthy();
		expect(back()).toBe(true);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("is left alone on other platforms", async () => {
		Platform.OS = "web";
		await start(1280);
		expect(listeners).toHaveLength(0);
	});
});
