import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

describe("opening a task's menu", () => {
	it.each([
		[400, false],
		[1280, true],
	])("at width %i selects the task: %s", async (width, selects) => {
		const app = await renderApp({ width });
		stop = app.stop;
		act(() => {
			app.container.store.select("tasks");
			app.container.store.addTask("Milk");
		});
		fireEvent.contextMenu(screen.getByLabelText("Open Milk"));
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(app.container.store.selectedTask !== null).toBe(selects);
	});
});
