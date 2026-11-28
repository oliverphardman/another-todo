import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Animated } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;
let finishers: ((result: { finished: boolean }) => void)[] = [];

beforeEach(() => {
	finishers = [];
	vi.spyOn(Animated, "timing").mockImplementation(
		(_value, config) =>
			({
				start: (done: (result: { finished: boolean }) => void) => {
					if (config.duration === 150) {
						finishers.push(done);
					} else {
						done({ finished: true });
					}
				},
			}) as unknown as Animated.CompositeAnimation,
	);
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	vi.restoreAllMocks();
});

async function start() {
	const app = await renderApp({ motion: { pressMs: 0, fillMs: 0, travelMs: 0, slideMs: 150 } });
	stop = app.stop;
	const input = screen.getByLabelText("Add a Task");
	fireEvent.change(input, { target: { value: "Slide" } });
	fireEvent.keyDown(input, { key: "Enter" });
	return app;
}

describe("the task details pane", () => {
	it("slides in when a task is opened and stays mounted until the slide out finishes", async () => {
		const app = await start();
		expect(screen.queryByLabelText("Task details")).toBeNull();
		fireEvent.click(screen.getByLabelText("Open Slide"));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
		expect(finishers).toHaveLength(1);
		act(() => finishers[0]!({ finished: true }));
		const pane = screen.getByLabelText("Task details");
		fireEvent.click(screen.getByLabelText("Close details"));
		expect(app.container.store.selectedTask).toBeNull();
		expect(screen.getByLabelText("Task details")).toBe(pane);
		expect(finishers).toHaveLength(2);
		act(() => finishers[1]!({ finished: true }));
		expect(screen.queryByLabelText("Task details")).toBeNull();
	});

	it("keeps the pane when the slide out is interrupted by opening a task again", async () => {
		await start();
		fireEvent.click(screen.getByLabelText("Open Slide"));
		act(() => finishers[0]!({ finished: true }));
		fireEvent.click(screen.getByLabelText("Close details"));
		fireEvent.click(screen.getByLabelText("Open Slide"));
		act(() => finishers[1]!({ finished: false }));
		act(() => finishers[2]!({ finished: true }));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Close details"));
		act(() => finishers[3]!({ finished: false }));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
	});
});
