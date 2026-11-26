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
