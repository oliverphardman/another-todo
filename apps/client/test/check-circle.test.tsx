import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { Animated } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NO_MOTION, STANDARD_MOTION, type Motion } from "../src/ui/motion";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	vi.restoreAllMocks();
});

async function start(motion: Motion = NO_MOTION) {
	const app = await renderApp({ motion });
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	const input = screen.getByLabelText("Add a Task");
	fireEvent.change(input, { target: { value: "Water plants" } });
	fireEvent.keyDown(input, { key: "Enter" });
	await act(async () => undefined);
	const task = () => app.container.store.get().tasks[0]!;
	return { ...app, task };
}

const face = (checkbox: HTMLElement) =>
	checkbox.querySelector<HTMLElement>('[data-testid="check-circle"]')!;
const fill = (checkbox: HTMLElement) =>
	checkbox.querySelector<HTMLElement>('[data-testid="check-circle-fill"]');

function expectPressed(checkbox: HTMLElement) {
	expect(face(checkbox).style.opacity).toBe("0.6");
	expect(face(checkbox).style.transform).toBe("scale(0.82)");
}

function expectResting(checkbox: HTMLElement) {
	expect(face(checkbox).style.opacity).toBe("1");
	expect(face(checkbox).style.transform).toBe("scale(1)");
}

async function hold(checkbox: HTMLElement) {
	await act(async () => {
		fireEvent.mouseDown(checkbox, { button: 0 });
	});
}

async function releaseOn(checkbox: HTMLElement) {
	await act(async () => {
		fireEvent.mouseUp(checkbox, { button: 0 });
		fireEvent.click(checkbox);
	});
}

async function releaseOutside() {
	await act(async () => {
		fireEvent.mouseMove(document.body, { buttons: 1 });
		fireEvent.mouseUp(document.body, { button: 0 });
	});
}

const rowCircle = (label = "Mark as completed") =>
	screen
		.getByLabelText("Open Water plants")
		.parentElement!.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;

describe("pressing a check circle", () => {
	it("shrinks and fades while held, then completes when released on it", async () => {
		const app = await start();
		expectResting(rowCircle());
		await hold(rowCircle());
		expectPressed(rowCircle());
		expect(app.task().completed).toBe(false);
		await releaseOn(rowCircle());
		const done = rowCircle("Mark as not completed");
		expectResting(done);
		expect(app.task().completed).toBe(true);
		expect(fill(done)!.style.transform).toBe("scale(1)");
		expect(fill(done)!.style.opacity).toBe("1");
	});

	it("restores without completing when released outside", async () => {
		const app = await start();
		await hold(rowCircle());
		await releaseOutside();
		expectResting(rowCircle());
		expect(app.task().completed).toBe(false);
		expect(fill(rowCircle())).toBeNull();
		expect(app.sounds.plays).toBe(0);
	});

	it("does the same in reverse for a completed task", async () => {
		const app = await start();
		await releaseOn(rowCircle());
		const done = () => rowCircle("Mark as not completed");
		await hold(done());
		expectPressed(done());
		await releaseOutside();
		expectResting(done());
		expect(app.task().completed).toBe(true);
		await hold(done());
		await releaseOn(done());
		expectResting(rowCircle());
		expect(app.task().completed).toBe(false);
		expect(fill(rowCircle())!.style.transform).toBe("scale(0)");
		expect(fill(rowCircle())!.style.opacity).toBe("0");
	});

	it("animates the press and the fill growing from the center", async () => {
		const runs: [number | undefined, unknown][] = [];
		vi.spyOn(Animated, "timing").mockImplementation((value, config) => {
			runs.push([config.duration, config.toValue]);
			return {
				start: () => (value as Animated.Value).setValue(config.toValue as number),
			} as unknown as Animated.CompositeAnimation;
		});
		await start(STANDARD_MOTION);
		runs.length = 0;
		await hold(rowCircle());
		await releaseOn(rowCircle());
		const { pressMs, fillMs } = STANDARD_MOTION;
		expect(runs.filter(([duration]) => duration === pressMs)).toEqual([
			[pressMs, 1],
			[pressMs, 0],
		]);
		expect(runs.filter(([duration]) => duration === fillMs)).toContainEqual([fillMs, 1]);
	});

	it("behaves the same in the task details", async () => {
		const app = await start();
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Open Water plants"));
		});
		const circle = (label: string) => {
			const all = screen.getAllByLabelText(label);
			return all[all.length - 1]!;
		};
		await hold(circle("Mark as completed"));
		expectPressed(circle("Mark as completed"));
		await releaseOutside();
		expect(app.task().completed).toBe(false);
		await hold(circle("Mark as completed"));
		await releaseOn(circle("Mark as completed"));
		expect(app.task().completed).toBe(true);
		expect(fill(circle("Mark as not completed"))!.style.transform).toBe("scale(1)");
	});

	it("behaves the same for steps", async () => {
		const app = await start();
		await act(async () => {
			app.container.store.addStep(app.task().id, "Fill the can");
		});
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Open Water plants"));
		});
		const open = () => screen.getByLabelText("Mark step Fill the can as completed");
		await hold(open());
		expectPressed(open());
		await releaseOutside();
		expectResting(open());
		expect(app.task().steps[0]!.completed).toBe(false);
		await releaseOn(open());
		expect(app.task().steps[0]!.completed).toBe(true);
	});
});
