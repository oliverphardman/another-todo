import { act, fireEvent, render, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ContextMenuController,
	ContextMenuHost,
	MenuPlacement,
	useContextMenuTrigger,
	type ContextMenuEntry,
	type ContextMenuTrigger,
} from "../src/ui/context-menu";
import { Pointer } from "../src/ui/pointer";
import { ThemeProvider } from "../src/ui/theme-context";

describe("Pointer", () => {
	it("reads the position from browser and touch events", () => {
		expect(Pointer.position({ clientX: 10, clientY: 20 })).toEqual({ x: 10, y: 20 });
		expect(Pointer.position({ nativeEvent: { pageX: 5, pageY: 6 } })).toEqual({ x: 5, y: 6 });
		expect(Pointer.position({})).toEqual({ x: 0, y: 0 });
	});

	it("reads modifier keys from either kind of event", () => {
		expect(Pointer.modifiers({ shiftKey: true })).toEqual({ shift: true, toggle: false });
		expect(Pointer.modifiers({ ctrlKey: true })).toEqual({ shift: false, toggle: true });
		expect(Pointer.modifiers({ metaKey: true })).toEqual({ shift: false, toggle: true });
		expect(Pointer.modifiers({ nativeEvent: { shiftKey: true, metaKey: true } })).toEqual({
			shift: true,
			toggle: true,
		});
		expect(Pointer.modifiers({ nativeEvent: { ctrlKey: true } }).toggle).toBe(true);
		expect(Pointer.modifiers({})).toEqual({ shift: false, toggle: false });
	});

	it("prevents the browser's own menu when it can", () => {
		const preventDefault = vi.fn();
		Pointer.suppressDefault({ preventDefault });
		expect(preventDefault).toHaveBeenCalledTimes(1);
		expect(() => Pointer.suppressDefault({})).not.toThrow();
	});
});

describe("MenuPlacement", () => {
	const window = { width: 800, height: 600 };

	it("opens at the pointer when there is room", () => {
		expect(MenuPlacement.at(100, 120, window, 5)).toEqual({ left: 100, top: 120 });
	});

	it("keeps the menu inside the window", () => {
		expect(MenuPlacement.at(790, 590, window, 5)).toEqual({
			left: 800 - 270 - 8,
			top: 600 - 216 - 8,
		});
		expect(MenuPlacement.at(-5, -5, window, 5)).toEqual({ left: 8, top: 8 });
		expect(MenuPlacement.at(10, 10, { width: 100, height: 100 }, 20)).toEqual({ left: 8, top: 8 });
	});
});

describe("ContextMenuController", () => {
	it("opens and closes", () => {
		const controller = new ContextMenuController();
		expect(controller.get()).toBeNull();
		controller.open({ x: 1, y: 2, label: "Menu", entries: [] });
		expect(controller.get()?.label).toBe("Menu");
		controller.close();
		expect(controller.get()).toBeNull();
	});
});

describe("useContextMenuTrigger", () => {
	const original = Platform.OS;
	let trigger: ContextMenuTrigger | undefined;

	afterEach(() => {
		Platform.OS = original;
		trigger = undefined;
	});

	function Probe({ onPress }: { onPress: () => void }) {
		trigger = useContextMenuTrigger("Probe menu", () => [
			{ kind: "action", key: "go", glyph: "plus", label: "Go", onPress } as ContextMenuEntry,
		]);
		return <p>probe</p>;
	}

	function renderProbe(onPress = () => undefined) {
		return render(
			<ThemeProvider scheme="light">
				<ContextMenuHost>
					<Probe onPress={onPress} />
				</ContextMenuHost>
			</ThemeProvider>,
		);
	}

	it("opens on right-click on the web and has no long press there", () => {
		const onPress = vi.fn();
		renderProbe(onPress);
		expect(trigger!.onLongPress).toBeUndefined();
		act(() =>
			trigger!.onContextMenu({ clientX: 10, clientY: 10, preventDefault: () => undefined }),
		);
		expect(screen.getByRole("menu", { name: "Probe menu" })).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Go"));
		expect(onPress).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("opens on long press on touch platforms", () => {
		Platform.OS = "ios";
		renderProbe();
		expect(trigger!.onLongPress).toBeDefined();
		act(() => trigger!.onLongPress!({ nativeEvent: { pageX: 30, pageY: 40 } }));
		expect(screen.getByRole("menu", { name: "Probe menu" })).toBeTruthy();
	});

	it("closes when the user clicks or right-clicks away", () => {
		renderProbe();
		act(() => trigger!.onContextMenu({ clientX: 1, clientY: 1 }));
		fireEvent.click(screen.getByLabelText("Close menu"));
		expect(screen.queryByRole("menu")).toBeNull();
		act(() => trigger!.onContextMenu({ clientX: 1, clientY: 1 }));
		fireEvent.contextMenu(screen.getByLabelText("Close menu"));
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("shows nothing until it is asked to", () => {
		renderProbe();
		expect(screen.queryByRole("menu")).toBeNull();
		expect(screen.getByText("probe")).toBeTruthy();
	});
});
