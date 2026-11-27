import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Animated, PanResponder, Text, type PanResponderCallbacks } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContainerProvider } from "../src/ui/container-context";
import { DrawerLayout } from "../src/ui/drawer-layout";
import { ThemeProvider } from "../src/ui/theme-context";
import { renderApp, setViewport } from "./support/render-app";
import { createTestContainer } from "./support/test-container";

let gestures: PanResponderCallbacks;
let finishers: ((result: { finished: boolean }) => void)[] = [];
let stop: (() => void) | undefined;

beforeEach(() => {
	finishers = [];
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	vi.restoreAllMocks();
});

function Harness({ slideMs }: { slideMs: number }) {
	const [lists, setLists] = useState(false);
	const [details, setDetails] = useState(false);
	const { container } = createTestContainer(undefined, { fillMs: 0, travelMs: 0, slideMs });
	return (
		<ThemeProvider scheme="light">
			<ContainerProvider container={container}>
				<DrawerLayout
					width={400}
					left={{
						open: lists,
						onChange: setLists,
						opensBySwipe: true,
						content: <Text>Lists</Text>,
					}}
					right={{ open: details, onChange: setDetails, content: <Text>Details</Text> }}
				>
					<Text onPress={() => setDetails(true)}>Tasks</Text>
				</DrawerLayout>
			</ContainerProvider>
		</ThemeProvider>
	);
}

function show(slideMs: number) {
	vi.spyOn(PanResponder, "create").mockImplementation((callbacks) => {
		gestures = callbacks;
		return { panHandlers: {} } as ReturnType<typeof PanResponder.create>;
	});
	vi.spyOn(Animated, "timing").mockImplementation(
		() =>
			({
				start: (done: (result: { finished: boolean }) => void) => void finishers.push(done),
			}) as unknown as Animated.CompositeAnimation,
	);
	return render(<Harness slideMs={slideMs} />);
}

const event = {} as never;
const drag = (dx: number, vx = 0) => ({ dx, dy: 0, vx }) as never;
const claims = (dx: number) => gestures.onMoveShouldSetPanResponderCapture!(event, drag(dx));
const grant = () => act(() => gestures.onPanResponderGrant!(event, drag(0)));
const move = (dx: number) => act(() => gestures.onPanResponderMove!(event, drag(dx)));
const release = (dx: number) => act(() => gestures.onPanResponderRelease!(event, drag(dx)));
const finish = (finished = true) => act(() => finishers.at(-1)!({ finished }));
const covered = (text: string) => screen.getByText(text).closest("[aria-hidden=true]") !== null;

describe("DrawerLayout", () => {
	it("drags the lists in with the finger, then slides them the rest of the way", () => {
		const values: number[] = [];
		vi.spyOn(Animated.Value.prototype, "setValue").mockImplementation(
			(value) => void values.push(value),
		);
		show(180);
		expect(screen.queryByText("Lists")).toBeNull();
		expect(claims(-40)).toBe(false);
		expect(claims(40)).toBe(true);
		grant();
		expect(screen.getByText("Lists")).toBeTruthy();
		move(100);
		expect(values.at(-1)).toBe(0.25);
		expect(covered("Tasks")).toBe(false);
		release(100);
		expect(finishers).toHaveLength(1);
		finish();
		expect(covered("Tasks")).toBe(true);
		expect(claims(40)).toBe(false);
		expect(claims(-40)).toBe(true);
		grant();
		release(-120);
		finish();
		expect(screen.queryByText("Lists")).toBeNull();
		expect(covered("Tasks")).toBe(false);
	});

	it("springs back after a short or interrupted drag", () => {
		show(180);
		grant();
		release(20);
		finish();
		expect(screen.queryByText("Lists")).toBeNull();
		grant();
		act(() => gestures.onPanResponderTerminate!(event, drag(0)));
		finish();
		expect(screen.queryByText("Lists")).toBeNull();
		expect(gestures.onPanResponderTerminationRequest!(event, drag(0))).toBe(false);
	});

	it("slides the details in when opened and only closes them by swiping", () => {
		show(180);
		expect(claims(-40)).toBe(false);
		fireEvent.click(screen.getByText("Tasks"));
		expect(screen.getByText("Details")).toBeTruthy();
		expect(finishers).toHaveLength(1);
		finish(false);
		expect(covered("Tasks")).toBe(false);
		expect(claims(-40)).toBe(false);
		expect(gestures.onMoveShouldSetPanResponder!(event, drag(40))).toBe(true);
		grant();
		release(200);
		finish();
		expect(screen.queryByText("Details")).toBeNull();
	});

	it("starts with the details already in place when one is open", async () => {
		const app = await renderApp({ width: 1280 });
		stop = app.stop;
		act(() => {
			app.container.store.select("tasks");
			app.container.store.selectTask(app.container.store.addTask("Open"));
		});
		await act(async () => setViewport(400));
		const showLists = await screen.findByLabelText("Show lists");
		expect(await screen.findByLabelText("Task details")).toBeTruthy();
		expect(showLists.closest("[aria-hidden=true]")).not.toBeNull();
	});

	it("moves at once without motion", () => {
		show(0);
		grant();
		release(100);
		expect(finishers).toHaveLength(0);
		expect(covered("Tasks")).toBe(true);
	});

	it("responds to real touches in the app", async () => {
		const app = await renderApp({ width: 400 });
		stop = app.stop;
		const touch = (x: number) => ({ identifier: 0, pageX: x, pageY: 300, target: document.body });
		const later = () => new Promise((resolve) => setTimeout(resolve, 5));
		const swipe = async (element: Element, from: number, to: number) => {
			fireEvent.touchStart(element, { touches: [touch(from)], changedTouches: [touch(from)] });
			for (const at of [(from + to) / 2, to]) {
				await later();
				fireEvent.touchMove(element, { touches: [touch(at)], changedTouches: [touch(at)] });
			}
			await later();
			fireEvent.touchEnd(element, { touches: [], changedTouches: [touch(to)] });
		};
		await act(() => swipe(screen.getByLabelText("Add a Task"), 20, 260));
		expect(screen.getByLabelText("Lists")).toBeTruthy();
		await act(() => swipe(screen.getByLabelText("My Day"), 300, 40));
		expect(screen.queryByLabelText("Lists")).toBeNull();
	});
});
