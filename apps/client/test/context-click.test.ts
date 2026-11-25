import { describe, expect, it, vi } from "vitest";
import { contextClickProps } from "../src/ui/context-click";
import { contextClickProps as macContextClickProps } from "../src/ui/context-click.macos";
import { Pointer } from "../src/ui/pointer";

describe("right clicking", () => {
	it("uses the browser's context menu event away from macOS", () => {
		const handler = vi.fn();
		expect(contextClickProps(handler)).toEqual({ onContextMenu: handler });
	});

	it("reacts only to the secondary button on macOS", () => {
		const handler = vi.fn();
		const { onAuxClick } = macContextClickProps(handler) as {
			onAuxClick: (event: { nativeEvent: { button: number } }) => void;
		};
		onAuxClick({ nativeEvent: { button: 1 } });
		expect(handler).not.toHaveBeenCalled();
		const secondary = { nativeEvent: { button: 2 } };
		onAuxClick(secondary);
		expect(handler).toHaveBeenCalledWith(secondary);
	});

	it("reads the position of a macOS mouse event", () => {
		expect(Pointer.position({ nativeEvent: { clientX: 4, clientY: 9 } })).toEqual({ x: 4, y: 9 });
	});
});
