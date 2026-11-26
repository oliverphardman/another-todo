import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Keyboard, Platform, Text, TextInput } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KeyboardDismisser } from "../src/ui/keyboard-dismisser";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
const hidden: (() => void)[] = [];
const removed = vi.fn();
const blur = vi.fn();
let stop: (() => void) | undefined;

beforeEach(() => {
	vi.spyOn(Keyboard, "addListener").mockImplementation((event, listener) => {
		if (event === "keyboardDidHide") {
			hidden.push(listener as () => void);
		}
		return { remove: removed } as never;
	});
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
	hidden.length = 0;
	vi.restoreAllMocks();
	removed.mockClear();
	blur.mockClear();
});

const mount = () =>
	render(
		<KeyboardDismisser>
			<Text>Content</Text>
		</KeyboardDismisser>,
	);

describe("KeyboardDismisser", () => {
	it.each(["android", "ios"] as const)(
		"leaves no field focused once the %s keyboard is put away",
		(platform) => {
			Platform.OS = platform;
			const focused = vi.fn((): { blur(): void } | null => ({ blur }));
			Object.assign(TextInput.State, { currentlyFocusedInput: focused });
			const view = mount();
			expect(screen.getByText("Content")).toBeTruthy();
			act(() => hidden[0]!());
			expect(blur).toHaveBeenCalledTimes(1);
			focused.mockReturnValue(null);
			act(() => hidden[0]!());
			expect(blur).toHaveBeenCalledTimes(1);
			view.unmount();
			expect(removed).toHaveBeenCalledTimes(1);
		},
	);

	it("does nothing where there is no on-screen keyboard", () => {
		Platform.OS = "web";
		mount();
		expect(hidden).toHaveLength(0);
	});
});

describe("tapping outside a text field", () => {
	const field = { name: "field" };
	const focused = vi.fn((): unknown => field);

	function setup(platform: typeof Platform.OS = "android") {
		Platform.OS = platform;
		vi.useFakeTimers();
		focused.mockReturnValue(field);
		Object.assign(TextInput.State, { currentlyFocusedInput: focused });
		const dismiss = vi.spyOn(Keyboard, "dismiss").mockImplementation(() => undefined);
		const view = mount();
		return { dismiss, view, content: screen.getByText("Content") };
	}

	function tap(element: Element, move = 0) {
		const touch = (x: number) => ({ identifier: 0, pageX: x, pageY: 50, target: element });
		fireEvent.touchStart(element, { touches: [touch(100)], changedTouches: [touch(100)] });
		fireEvent.touchEnd(element, { touches: [], changedTouches: [touch(100 + move)] });
		act(() => void vi.advanceTimersByTime(200));
	}

	afterEach(() => {
		vi.useRealTimers();
	});

	it("puts the keyboard away", () => {
		const { dismiss, content } = setup();
		tap(content);
		expect(dismiss).toHaveBeenCalledTimes(1);
	});

	it("keeps it while scrolling", () => {
		const { dismiss, content } = setup();
		tap(content, 40);
		expect(dismiss).not.toHaveBeenCalled();
	});

	it("keeps it when nothing was being typed in", () => {
		const { dismiss, content } = setup();
		focused.mockReturnValue(null);
		tap(content);
		expect(dismiss).not.toHaveBeenCalled();
	});

	it("keeps it when the tap moves to another field", () => {
		const { dismiss, content } = setup();
		focused.mockReturnValueOnce(field).mockReturnValue({ name: "other" });
		tap(content);
		expect(dismiss).not.toHaveBeenCalled();
	});

	it("ignores an end without a start and forgets pending taps when removed", () => {
		const { dismiss, content, view } = setup();
		const touch = { identifier: 0, pageX: 1, pageY: 1, target: content };
		fireEvent.touchEnd(content, { touches: [], changedTouches: [touch] });
		fireEvent.touchStart(content, { touches: [touch], changedTouches: [touch] });
		fireEvent.touchEnd(content, { touches: [], changedTouches: [touch] });
		view.unmount();
		act(() => void vi.advanceTimersByTime(200));
		expect(dismiss).not.toHaveBeenCalled();
	});

	it.each(["macos", "windows"] as const)(
		"leaves the field on %s, where clicking elsewhere would otherwise keep it focused",
		(platform) => {
			const { dismiss, content } = setup(platform as typeof Platform.OS);
			expect(hidden).toHaveLength(0);
			tap(content);
			expect(dismiss).toHaveBeenCalledTimes(1);
		},
	);

	it("leaves browsers to handle it", () => {
		const { dismiss, content } = setup("web");
		tap(content);
		expect(dismiss).not.toHaveBeenCalled();
	});
});

describe("the lists drawer", () => {
	it("puts the keyboard away as it opens and closes", async () => {
		const app = await renderApp({ width: 400 });
		stop = app.stop;
		const dismiss = vi.spyOn(Keyboard, "dismiss");
		fireEvent.click(screen.getByLabelText("Show lists"));
		expect(dismiss).toHaveBeenCalledTimes(1);
		fireEvent.click(screen.getByLabelText("Tasks"));
		expect(dismiss).toHaveBeenCalledTimes(2);
	});
});
