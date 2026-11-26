import { act, cleanup, render, screen } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const keyboard = vi.hoisted(() => ({
	listeners: new Map<string, () => void>(),
	removed: [] as string[],
	props: {} as { enabled?: boolean; behavior?: string },
}));

vi.mock("react-native", () => ({
	Keyboard: {
		addListener: (event: string, listener: () => void) => {
			keyboard.listeners.set(event, listener);
			return { remove: () => keyboard.removed.push(event) };
		},
	},
	KeyboardAvoidingView: (props: { children: ReactNode; enabled: boolean; behavior: string }) => {
		keyboard.props = props;
		return createElement("div", null, props.children);
	},
}));

import { KeyboardSafe } from "../src/ui/keyboard-safe";

afterEach(cleanup);

describe("KeyboardSafe", () => {
	it("makes room only while the keyboard is up, leaving no gap afterwards", () => {
		const view = render(<KeyboardSafe>Field</KeyboardSafe>);
		expect(screen.getByText("Field")).toBeTruthy();
		expect(keyboard.props.behavior).toBe("padding");
		expect(keyboard.props.enabled).toBe(false);
		for (const event of ["keyboardWillShow", "keyboardDidShow"]) {
			act(() => keyboard.listeners.get(event)!());
			expect(keyboard.props.enabled).toBe(true);
			act(() => keyboard.listeners.get("keyboardDidHide")!());
			expect(keyboard.props.enabled).toBe(false);
		}
		view.unmount();
		expect(keyboard.removed).toEqual(["keyboardWillShow", "keyboardDidShow", "keyboardDidHide"]);
	});
});
