import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SwipeDetector, touchPoint } from "../src/ui/swipe";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;
afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

const touch = (x: number, y: number) => ({
	pageX: x,
	pageY: y,
	force: 0,
	identifier: 0,
	target: document.body,
	timestamp: 1,
});

function swipe(element: Element, from: [number, number], to: [number, number]) {
	fireEvent.touchStart(element, {
		touches: [touch(...from)],
		changedTouches: [touch(...from)],
	});
	fireEvent.touchEnd(element, { touches: [], changedTouches: [touch(...to)] });
}

describe("SwipeDetector", () => {
	it("recognizes long, mostly horizontal movements only", () => {
		expect(SwipeDetector.classify(80, 5)).toBe("right");
		expect(SwipeDetector.classify(-80, 5)).toBe("left");
		expect(SwipeDetector.classify(30, 0)).toBeNull();
		expect(SwipeDetector.classify(80, 70)).toBeNull();
	});
});

describe("touchPoint", () => {
	it("reads browser touches, native event touches and falls back to the pointer", () => {
		expect(touchPoint({ touches: [{ pageX: 1, pageY: 2 }] }, false)).toEqual({ x: 1, y: 2 });
		expect(touchPoint({ changedTouches: [{ pageX: 3, pageY: 4 }] }, true)).toEqual({ x: 3, y: 4 });
		expect(touchPoint({ nativeEvent: { touches: [{ pageX: 5, pageY: 6 }] } }, false)).toEqual({
			x: 5,
			y: 6,
		});
		expect(touchPoint({ nativeEvent: { changedTouches: [{ pageX: 7, pageY: 8 }] } }, true)).toEqual(
			{ x: 7, y: 8 },
		);
		expect(touchPoint({ clientX: 9, clientY: 10 }, true)).toEqual({ x: 9, y: 10 });
	});
});

describe("swipe gestures on narrow screens", () => {
	it("opens the lists with a right swipe and closes them with a left swipe", async () => {
		const app = await renderApp({ width: 400 });
		stop = app.stop;
		const list = () => screen.getByLabelText("Show lists");
		swipe(list(), [20, 300], [20, 310]);
		expect(screen.queryByLabelText("Lists")).toBeNull();
		swipe(list(), [200, 300], [100, 300]);
		expect(screen.queryByLabelText("Lists")).toBeNull();
		swipe(list(), [20, 300], [160, 305]);
		const sidebar = screen.getByLabelText("Lists");
		swipe(sidebar, [200, 300], [250, 300]);
		expect(screen.getByLabelText("Lists")).toBeTruthy();
		swipe(sidebar, [250, 300], [100, 300]);
		expect(screen.queryByLabelText("Lists")).toBeNull();
	});

	it("closes the task details with a right swipe", async () => {
		const app = await renderApp({ width: 400 });
		stop = app.stop;
		const input = screen.getByLabelText("Add a task");
		fireEvent.change(input, { target: { value: "Swipe" } });
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("Open Swipe"));
		const details = screen.getByLabelText("Task details");
		swipe(details, [250, 300], [100, 300]);
		expect(screen.getByLabelText("Task details")).toBeTruthy();
		swipe(details, [20, 300], [200, 300]);
		expect(screen.queryByLabelText("Task details")).toBeNull();
	});
});
