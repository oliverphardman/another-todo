import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { Animated, Platform } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListPositions } from "../src/ui/list-motion";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
let stop: (() => void) | undefined;

interface Run {
	readonly from: number;
	readonly to: number;
	readonly duration: number | undefined;
	readonly native: boolean;
}

let runs: Run[] = [];

beforeEach(() => {
	runs = [];
	vi.spyOn(Animated, "timing").mockImplementation((value, config) => {
		runs.push({
			from: (value as unknown as { __getValue(): number }).__getValue(),
			to: config.toValue as number,
			duration: config.duration,
			native: config.useNativeDriver,
		});
		return {
			start: () => (value as Animated.Value).setValue(config.toValue as number),
		} as unknown as Animated.CompositeAnimation;
	});
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
	vi.restoreAllMocks();
});

const PITCH = 54;
const HEADER = 48;

async function start(motion = { pressMs: 50, fillMs: 100, travelMs: 200, slideMs: 0 }) {
	const app = await renderApp({ motion });
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	const input = screen.getByLabelText("Add a Task");
	for (const title of ["Third", "Second", "First"]) {
		app.clock.advance(1000);
		fireEvent.change(input, { target: { value: title } });
		fireEvent.keyDown(input, { key: "Enter" });
	}
	await act(async () => undefined);
	runs = [];
	return app;
}

const titles = () =>
	screen.getAllByLabelText(/^Open /).map((row) => row.getAttribute("aria-label")!.slice(5));
const circle = (title: string, label = "Mark as completed") => {
	const row = screen.getByLabelText(`Open ${title}`).parentElement!;
	return row.querySelector<HTMLElement>(`[aria-label="${label}"]`)!;
};
const moves = () => runs.filter((run) => run.duration === 200).map((run) => run.from);
const fills = () => runs.filter((run) => run.duration === 100).map((run) => [run.from, run.to]);

async function click(element: HTMLElement) {
	await act(async () => {
		fireEvent.click(element);
	});
}

describe("completing a task with motion", () => {
	it("completes at once and glides every row from where it was", async () => {
		const app = await start();
		expect(titles()).toEqual(["First", "Second", "Third"]);
		await click(circle("First"));
		await waitFor(() => expect(titles()).toEqual(["Second", "Third", "First"]));
		expect(app.sounds.plays).toBe(1);
		expect(moves().sort((a, b) => a - b)).toEqual([-(2 * PITCH + HEADER), PITCH, PITCH]);
		expect(runs.every((run) => run.duration !== 200 || run.to === 0)).toBe(true);
		expect(fills()).toEqual([[0, 1]]);
	});

	it("travels by the heights the rows were measured at", async () => {
		await start();
		type Measured = HTMLElement & {
			__reactLayoutHandler?: (event: { nativeEvent: { layout: { height: number } } }) => void;
		};
		let wrapper = screen.getByLabelText("Open Second") as Measured | null;
		while (wrapper !== null && wrapper.__reactLayoutHandler === undefined) {
			wrapper = wrapper.parentElement as Measured | null;
		}
		wrapper!.__reactLayoutHandler!({ nativeEvent: { layout: { height: 90 } } });
		await click(circle("First"));
		await waitFor(() => expect(moves().length).toBeGreaterThan(0));
		expect(moves()).toContain(-(90 + PITCH + HEADER));
	});

	it("glides back the same way when a task is uncompleted", async () => {
		const app = await start();
		await click(circle("First"));
		await waitFor(() => expect(titles()).toEqual(["Second", "Third", "First"]));
		runs = [];
		await click(circle("First", "Mark as not completed"));
		await waitFor(() => expect(titles()).toEqual(["First", "Second", "Third"]));
		expect(app.sounds.plays).toBe(1);
		expect(moves().sort((a, b) => a - b)).toEqual([-PITCH, -PITCH, 2 * PITCH + HEADER]);
		expect(fills()).toEqual([[1, 0]]);
	});

	it("animates completions made elsewhere, such as from the details", async () => {
		const app = await start();
		await act(async () =>
			app.container.store.toggleCompleted(app.container.store.get().tasks[0]!.id),
		);
		await waitFor(() => expect(moves().length).toBeGreaterThan(0));
	});

	it("closes the gap when the finished task is hidden", async () => {
		await start();
		await click(circle("Second"));
		await click(screen.getByLabelText("Hide completed tasks"));
		runs = [];
		await click(circle("First"));
		await waitFor(() => expect(titles()).toEqual(["Third"]));
		expect(moves()).toContain(PITCH);
	});

	it("does not move anything for other changes or when switching lists", async () => {
		const app = await start();
		await act(async () => {
			app.container.store.addTask("Newest");
		});
		await act(async () => app.container.store.select("tasks"));
		expect(moves()).toEqual([]);
	});

	it("uses the native driver on phones", async () => {
		Platform.OS = "android";
		await start();
		await click(circle("First"));
		await waitFor(() => expect(moves().length).toBeGreaterThan(0));
		expect(runs.filter((run) => run.duration === 200).every((run) => run.native)).toBe(true);
	});

	it("changes at once without motion", async () => {
		await start({ pressMs: 0, fillMs: 0, travelMs: 0, slideMs: 0 });
		await click(circle("First"));
		await waitFor(() => expect(titles()).toEqual(["Second", "Third", "First"]));
		expect(runs).toEqual([]);
	});
});

describe("ListPositions", () => {
	it("stacks measured heights, estimating the ones not yet measured", () => {
		const items = ["a", "b", "c"].map((key) => ({
			key,
			kind: "task" as const,
			estimatedHeight: 10,
			render: () => null,
		}));
		expect([...ListPositions.of(items, (key) => (key === "a" ? 70 : undefined))]).toEqual([
			["a", 0],
			["b", 70],
			["c", 80],
		]);
	});
});
