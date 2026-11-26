import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Keyboard } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	vi.restoreAllMocks();
});

describe("task details footer", () => {
	it("stays behind the on-screen keyboard instead of riding on top of it", async () => {
		const listeners = new Map<string, Set<() => void>>();
		vi.spyOn(Keyboard, "addListener").mockImplementation((event, listener) => {
			const set = listeners.get(event) ?? new Set();
			listeners.set(event, set.add(listener as () => void));
			return { remove: () => void set.delete(listener as () => void) } as never;
		});
		const emit = (event: string) => act(() => listeners.get(event)!.forEach((run) => run()));
		const app = await renderApp({ width: 400 });
		stop = app.stop;
		act(() => {
			app.container.store.select("tasks");
			app.container.store.addTask("Milk");
		});
		fireEvent.click(screen.getByLabelText("Open Milk"));
		expect(screen.getByLabelText("Delete task")).toBeTruthy();
		emit("keyboardDidShow");
		expect(screen.queryByLabelText("Delete task")).toBeNull();
		expect(screen.queryByText(/^Created/)).toBeNull();
		emit("keyboardDidHide");
		expect(screen.getByLabelText("Delete task")).toBeTruthy();
	});
});
