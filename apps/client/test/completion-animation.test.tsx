import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Animated } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;
let finishers: ((result: { finished: boolean }) => void)[] = [];

beforeEach(() => {
	finishers = [];
	vi.spyOn(Animated, "parallel").mockImplementation(
		() =>
			({
				start: (done: (result: { finished: boolean }) => void) => {
					finishers.push(done);
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
	const app = await renderApp({ motion: { fillMs: 100, travelMs: 100, slideMs: 0 } });
	stop = app.stop;
	const input = screen.getByLabelText("Add a task");
	for (const title of ["First", "Second"]) {
		fireEvent.change(input, { target: { value: title } });
		fireEvent.keyDown(input, { key: "Enter" });
	}
	return app;
}

const completedCount = (app: Awaited<ReturnType<typeof start>>) =>
	app.container.store.get().tasks.filter((task) => task.completed).length;

describe("completing a task with motion", () => {
	it("keeps the task in place while it animates and then moves it to the completed section", async () => {
		const app = await start();
		fireEvent.click(screen.getAllByLabelText("Mark as completed")[0]!);
		expect(completedCount(app)).toBe(0);
		expect(app.sounds.plays).toBe(1);
		expect(finishers).toHaveLength(1);
		act(() => finishers[0]!({ finished: true }));
		expect(completedCount(app)).toBe(1);
		expect(screen.getByText("Completed 1")).toBeTruthy();
		expect(app.sounds.plays).toBe(1);
	});

	it("ignores a second tap while the task is animating", async () => {
		const app = await start();
		const circle = screen.getAllByLabelText("Mark as completed")[0]!;
		fireEvent.click(circle);
		fireEvent.click(circle);
		expect(finishers).toHaveLength(1);
		act(() => finishers[0]!({ finished: true }));
		expect(completedCount(app)).toBe(1);
	});

	it("uncompletes immediately", async () => {
		const app = await start();
		fireEvent.click(screen.getAllByLabelText("Mark as completed")[0]!);
		act(() => finishers[0]!({ finished: true }));
		fireEvent.click(screen.getByLabelText("Mark as not completed"));
		expect(completedCount(app)).toBe(0);
		expect(finishers).toHaveLength(1);
	});

	it("does not touch the store if the row goes away mid-animation", async () => {
		const app = await start();
		fireEvent.click(screen.getAllByLabelText("Mark as completed")[0]!);
		cleanup();
		act(() => finishers[0]!({ finished: true }));
		expect(completedCount(app)).toBe(0);
	});
});
