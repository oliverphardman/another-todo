import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { PanResponder, Platform, type PanResponderCallbacks } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
let gestures: PanResponderCallbacks[] = [];
let stop: (() => void) | undefined;

beforeEach(() => {
	Platform.OS = "android";
	gestures = [];
	const create = PanResponder.create.bind(PanResponder);
	vi.spyOn(PanResponder, "create").mockImplementation((callbacks) => {
		gestures.push(callbacks);
		return create(callbacks);
	});
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const ROW = 44;
const names = ["One", "Two", "Three"];

function place() {
	vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
		this: HTMLElement,
	) {
		const index = names.indexOf(this.getAttribute("aria-label") ?? "");
		return { x: 0, y: index * ROW, left: 0, top: index * ROW, width: 200, height: ROW } as DOMRect;
	});
	for (const element of screen.getAllByRole("button")) {
		Object.defineProperties(element, {
			offsetHeight: { configurable: true, value: ROW },
			offsetWidth: { configurable: true, value: 200 },
			offsetTop: {
				configurable: true,
				value: names.indexOf(element.getAttribute("aria-label") ?? "") * ROW,
			},
		});
	}
}

async function start() {
	const app = await renderApp({ width: 1280 });
	stop = app.stop;
	act(() => names.forEach((name) => app.container.store.addList(name)));
	place();
	vi.useFakeTimers();
	const order = () => app.container.store.orderedLists().map((list) => list.name);
	return { app, order };
}

const row = (name: string) => screen.getByLabelText(name, { selector: "[role=button]" });
const reorder = () => gestures[gestures.length - 1]!;
const event = {} as never;
const drag = (dy: number) => ({ dy }) as never;

function hold(name: string) {
	fireEvent.mouseDown(row(name), { button: 0 });
	act(() => void vi.advanceTimersByTime(600));
}

function letGo(name: string) {
	fireEvent.mouseUp(row(name), { button: 0 });
	act(() => void vi.advanceTimersByTime(200));
}

describe("holding a list in the sidebar", () => {
	it("drags it to where it is let go", async () => {
		const { order } = await start();
		const callbacks = reorder();
		expect(callbacks.onMoveShouldSetPanResponderCapture!(event, drag(30))).toBe(false);
		hold("One");
		expect(callbacks.onMoveShouldSetPanResponder!(event, drag(2))).toBe(false);
		expect(callbacks.onMoveShouldSetPanResponderCapture!(event, drag(30))).toBe(true);
		act(() => void callbacks.onPanResponderGrant!(event, drag(30)));
		act(() => void callbacks.onPanResponderMove!(event, drag(ROW * 2 + 10)));
		expect(row("One").style.transform).toContain(`translateY(${ROW * 2 + 10}px)`);
		expect(callbacks.onPanResponderTerminationRequest!(event, drag(0))).toBe(false);
		letGo("One");
		expect(screen.queryByRole("menu")).toBeNull();
		act(() => void callbacks.onPanResponderRelease!(event, drag(ROW * 2 + 10)));
		expect(order()).toEqual(["Two", "Three", "One"]);
		expect(callbacks.onMoveShouldSetPanResponderCapture!(event, drag(30))).toBe(false);
	});

	it("leaves the order alone when the gesture is taken away", async () => {
		const { order } = await start();
		const callbacks = reorder();
		hold("Three");
		act(() => void callbacks.onPanResponderGrant!(event, drag(-30)));
		act(() => void callbacks.onPanResponderMove!(event, drag(-ROW * 3)));
		act(() => void callbacks.onPanResponderTerminate!(event, drag(0)));
		expect(order()).toEqual(names);
		expect(row("Three").style.transform).toBe("");
	});

	it("opens the list menu when let go without moving", async () => {
		const { order } = await start();
		hold("Two");
		expect(screen.queryByRole("menu")).toBeNull();
		letGo("Two");
		expect(screen.getByRole("menu")).toBeTruthy();
		expect(order()).toEqual(names);
	});

	it("does neither for a short tap", async () => {
		await start();
		fireEvent.click(row("Two"));
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("leaves pointer platforms to their own dragging", async () => {
		Platform.OS = "web";
		await start();
		hold("Two");
		expect(reorder().onMoveShouldSetPanResponderCapture!(event, drag(30))).toBe(false);
	});
});
