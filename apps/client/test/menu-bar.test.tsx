import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { NativeModules } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DesktopMenuBarBridge } from "../src/ui/desktop-menu-bar-bridge";
import { MenuBar, type MenuBarBridge } from "../src/ui/menu-bar";
import { menuBarBridge as unavailable } from "../src/ui/menu-bar-bridge";
import type { NativeMenuItem } from "../src/ui/native-menu";
import { renderApp } from "./support/render-app";

class FakeMenuBar implements MenuBarBridge {
	shown: readonly NativeMenuItem[] = [];
	private waiting: ((key: string | null) => void) | null = null;

	isAvailable(): boolean {
		return true;
	}

	show(menus: readonly NativeMenuItem[]): void {
		this.shown = menus;
	}

	nextSelection(): Promise<string | null> {
		return new Promise((resolve) => (this.waiting = resolve));
	}

	async choose(key: string | null): Promise<void> {
		await act(async () => this.waiting!(key));
	}

	menu(label: string): readonly NativeMenuItem[] {
		return this.shown.find((item) => item.label === label)!.children!;
	}

	labels(label: string): string[] {
		return this.menu(label)
			.filter((item) => item.kind !== "separator")
			.map((item) => item.label);
	}
}

const original = MenuBar.bridge;
let bar: FakeMenuBar;
let stop: (() => void) | undefined;

beforeEach(() => {
	bar = new FakeMenuBar();
	MenuBar.bridge = bar;
});

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	MenuBar.bridge = original;
});

async function start() {
	const app = await renderApp();
	stop = app.stop;
	return app;
}

function addTask(title: string): void {
	const input = screen.getByLabelText("Add a task");
	fireEvent.change(input, { target: { value: title } });
	fireEvent.keyDown(input, { key: "Enter" });
}

describe("the menu bar", () => {
	it("offers task actions only once a task is selected", async () => {
		const app = await start();
		expect(bar.shown.map((item) => item.label)).toEqual(["Task", "List"]);
		expect(bar.menu("Task")).toEqual([
			expect.objectContaining({ label: "No task selected", disabled: true }),
		]);
		await bar.choose("task/none");
		expect(app.container.store.get().tasks).toEqual([]);
		addTask("Pay rent");
		fireEvent.click(screen.getByLabelText("Open Pay rent"));
		expect(bar.labels("Task")).toContain("Mark as Important");
		await bar.choose("task/important");
		expect(app.container.store.get().tasks[0]!.important).toBe(true);
		expect(bar.labels("Task")).toContain("Remove Importance");
	});

	it("runs nested entries, asks before deleting and ignores unknown choices", async () => {
		const app = await start();
		act(() => void app.container.store.addList("Home"));
		act(() => app.container.store.select("tasks"));
		addTask("Sweep");
		fireEvent.click(screen.getByLabelText("Open Sweep"));
		const home = app.container.store.get().lists[0]!.id;
		await bar.choose(`task/move/move-${home}`);
		expect(app.container.store.get().tasks[0]!.listId).toBe(home);
		await bar.choose(null);
		await bar.choose("task/nothing");
		await bar.choose("task");
		await bar.choose("task/delete");
		fireEvent.click(within(screen.getByRole("alert")).getByLabelText("Delete task"));
		await act(async () => undefined);
		expect(app.container.store.get().tasks).toEqual([]);
	});

	it("opens date and theme panels in the window", async () => {
		await start();
		addTask("Call");
		fireEvent.click(screen.getByLabelText("Open Call"));
		await bar.choose("task/pick-date");
		expect(screen.getByLabelText("Due date options")).toBeTruthy();
	});

	it("combines the list's right-click and view options", async () => {
		const app = await start();
		expect(bar.labels("List")).not.toContain("Rename List");
		act(() => void app.container.store.addList("Home"));
		const labels = bar.labels("List");
		expect(labels).toEqual(
			expect.arrayContaining(["Share List", "Move List Up", "Sort", "Duplicate List"]),
		);
		expect(labels.filter((label) => label === "Rename List")).toHaveLength(1);
		expect(labels.at(-1)).toBe("Delete List");
		const id = app.container.store.get().lists[0]!.id;
		await bar.choose("list/rename");
		expect(app.container.store.get().renamingViewId).toBe(id);
		await bar.choose("list/delete");
		expect(app.container.store.get().lists).toEqual([]);
	});

	it("clears the menus when the app goes away", async () => {
		const app = await start();
		app.unmount();
		expect(bar.shown).toEqual([]);
	});

	it("stops listening if the native side fails", async () => {
		const failing = vi.fn(async () => {
			throw new Error("gone");
		});
		bar.nextSelection = failing;
		await start();
		expect(failing).toHaveBeenCalledTimes(1);
	});
});

describe("menu bar bridges", () => {
	it("does nothing away from macOS", async () => {
		expect(unavailable.isAvailable()).toBe(false);
		expect(unavailable.show([])).toBeUndefined();
		expect(await unavailable.nextSelection()).toBeNull();
	});

	it("passes menus and selections through the native module", async () => {
		const module = { setMenuBar: vi.fn(), nextMenuBarSelection: async () => "task/delete" };
		const bridge = new DesktopMenuBarBridge(module);
		expect(bridge.isAvailable()).toBe(true);
		bridge.show([]);
		expect(module.setMenuBar).toHaveBeenCalledWith([]);
		expect(await bridge.nextSelection()).toBe("task/delete");
		expect(new DesktopMenuBarBridge(undefined).isAvailable()).toBe(false);
		expect(new DesktopMenuBarBridge({}).isAvailable()).toBe(false);
	});

	it("uses the menu module on macOS", async () => {
		(NativeModules as Record<string, unknown>).AnotherToDoMenu = { setMenuBar: vi.fn() };
		const { menuBarBridge } = await import("../src/ui/menu-bar-bridge.macos");
		expect(menuBarBridge.isAvailable()).toBe(true);
		delete (NativeModules as Record<string, unknown>).AnotherToDoMenu;
	});
});
