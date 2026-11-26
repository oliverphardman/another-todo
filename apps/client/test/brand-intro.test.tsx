import { act, cleanup, render, screen } from "@testing-library/react";
import { Animated, TextInput } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../src/i18n/i18n-context";
import { BrandIntro, INTRO_TIMING } from "../src/ui/brand-intro";
import { ThemeProvider } from "../src/ui/theme-context";

let order: number[] = [];
let finish: (finished: boolean) => void = () => undefined;
const stop = vi.fn();

beforeEach(() => {
	order = [];
	vi.spyOn(Animated, "timing").mockImplementation((_value, config) => {
		order.push(config.duration!);
		return { start: () => undefined } as unknown as Animated.CompositeAnimation;
	});
	vi.spyOn(Animated, "sequence").mockImplementation(
		() =>
			({
				start: (done: (result: { finished: boolean }) => void) => {
					finish = (finished) => done({ finished });
				},
				stop,
			}) as unknown as Animated.CompositeAnimation,
	);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

function show() {
	return render(
		<ThemeProvider scheme="light">
			<I18nProvider>
				<BrandIntro>
					<TextInput accessibilityLabel="Server address" autoFocus />
				</BrandIntro>
			</I18nProvider>
		</ThemeProvider>,
	);
}

describe("the welcome introduction", () => {
	it("brings in the icon, then the check, then the name, before prompting", () => {
		const view = show();
		expect(screen.getByRole("heading", { name: "Another To Do" })).toBeTruthy();
		expect(order).toEqual([INTRO_TIMING.tileMs, INTRO_TIMING.checkMs, INTRO_TIMING.titleMs]);
		const waiting = screen.getByLabelText("Server address");
		expect(waiting.closest("[aria-hidden=true]")).not.toBeNull();
		act(() => finish(true));
		const ready = screen.getByLabelText("Server address");
		expect(ready).not.toBe(waiting);
		expect(ready.closest("[aria-hidden=true]")).toBeNull();
		expect(document.activeElement).toBe(ready);
		expect(order.at(-1)).toBe(INTRO_TIMING.promptMs);
		view.unmount();
		expect(stop).toHaveBeenCalled();
	});

	it("does not prompt if it is interrupted", () => {
		show();
		act(() => finish(false));
		expect(screen.getByLabelText("Server address").closest("[aria-hidden=true]")).not.toBeNull();
	});

	it("can show the finished welcome at once", () => {
		render(
			<ThemeProvider scheme="light">
				<I18nProvider>
					<BrandIntro animate={false}>
						<TextInput accessibilityLabel="Username" autoFocus />
					</BrandIntro>
				</I18nProvider>
			</ThemeProvider>,
		);
		expect(order).toEqual([]);
		const field = screen.getByLabelText("Username");
		expect(field.closest("[aria-hidden=true]")).toBeNull();
		expect(document.activeElement).toBe(field);
	});
});
