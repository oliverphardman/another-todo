import { render } from "@testing-library/react";
import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

interface ViewProps {
	readonly children?: ReactNode;
	readonly focusable?: boolean;
	readonly keyDownEvents?: { key: string }[];
	readonly onKeyDown?: (event: { nativeEvent: { key: string } }) => void;
}

const view = vi.hoisted(() => ({ props: {} as object, instance: {}, focus: vi.fn() }));

vi.mock("react-native", () => ({
	codegenNativeCommands: () => ({ focus: view.focus }),
	View: forwardRef(function View(props: ViewProps, ref) {
		view.props = props;
		useImperativeHandle(ref, () => view.instance);
		return props.children;
	}),
}));

import { DialogKeys } from "../src/ui/dialog-keys.macos";

describe("dialog keys on macOS", () => {
	beforeEach(() => view.focus.mockClear());

	it("takes keyboard focus and answers Enter and Escape", () => {
		const accept = vi.fn();
		const dismiss = vi.fn();
		const { container } = render(
			<DialogKeys onAccept={accept} onDismiss={dismiss}>
				Delete?
			</DialogKeys>,
		);
		const props = view.props as ViewProps;
		expect(container.textContent).toBe("Delete?");
		expect(view.focus).toHaveBeenCalledExactlyOnceWith(view.instance);
		expect(props.focusable).toBe(true);
		expect(props.keyDownEvents).toEqual([{ key: "Enter" }, { key: "Escape" }]);
		props.onKeyDown!({ nativeEvent: { key: "a" } });
		expect(accept).not.toHaveBeenCalled();
		expect(dismiss).not.toHaveBeenCalled();
		props.onKeyDown!({ nativeEvent: { key: "Enter" } });
		expect(accept).toHaveBeenCalledTimes(1);
		props.onKeyDown!({ nativeEvent: { key: "Escape" } });
		expect(dismiss).toHaveBeenCalledTimes(1);
	});
});
