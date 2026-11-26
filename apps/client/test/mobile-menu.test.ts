import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { ActionSheetMenuBridge, type ActionSheetOptions } from "../src/ui/action-sheet-menu-bridge";
import { AndroidMenuBridge } from "../src/ui/android-menu-bridge";
import type { NativeMenuItem } from "../src/ui/native-menu";

const modules = vi.hoisted(() => ({
	show: vi.fn(async () => "picked"),
	requireOptionalNativeModule: vi.fn(),
	sheet: vi.fn((_: unknown, chosen: (index: number) => void) => chosen(0)),
}));

vi.mock("expo", () => ({ requireOptionalNativeModule: modules.requireOptionalNativeModule }));
vi.mock("react-native", () => ({
	ActionSheetIOS: { showActionSheetWithOptions: modules.sheet },
}));

const items: NativeMenuItem[] = [
	{ key: "done", label: "Done", kind: "action", checked: true },
	{ key: "s", label: "", kind: "separator" },
	{ key: "later", label: "Later", kind: "action", disabled: true },
	{
		key: "move",
		label: "Move",
		kind: "submenu",
		children: [{ key: "inbox", label: "Inbox", kind: "action" }],
	},
	{ key: "delete", label: "Delete", kind: "action", destructive: true },
];
const request = { items, x: 12, y: 34, cancelLabel: "Cancel" };

function sheet(...choices: number[]) {
	const shown: ActionSheetOptions[] = [];
	const bridge = new ActionSheetMenuBridge({
		showActionSheetWithOptions: (options, chosen) => {
			shown.push(options);
			chosen(choices.shift()!);
		},
	});
	return { bridge, shown };
}

describe("the Android menu bridge", () => {
	it("hands the entries and the touch point to the module", async () => {
		const bridge = new AndroidMenuBridge({ show: modules.show });
		expect(bridge.isAvailable()).toBe(true);
		expect(await bridge.show(request)).toBe("picked");
		expect(modules.show).toHaveBeenCalledWith(JSON.stringify(items), 12, 34);
	});

	it("uses the app's own menus when the module is missing", async () => {
		modules.requireOptionalNativeModule.mockReturnValue(null);
		const { nativeMenuBridge } = await import("../src/ui/native-menu-bridge.android");
		expect(modules.requireOptionalNativeModule).toHaveBeenCalledWith("AnotherToDoMenu");
		expect(nativeMenuBridge.isAvailable()).toBe(false);
	});

	it("is registered for Expo to link under the name the app asks for", () => {
		const read = (path: string) => readFileSync(resolve("modules/another-todo-menu", path), "utf8");
		const source = read(
			"android/src/main/java/dev/oliverhardman/anothertodo/menu/AnotherToDoMenuModule.kt",
		);
		expect(JSON.parse(read("expo-module.config.json")).android.modules).toEqual([
			"dev.oliverhardman.anothertodo.menu.AnotherToDoMenuModule",
		]);
		expect(source).toContain('Name("AnotherToDoMenu")');
		expect(source).toContain('AsyncFunction("show")');
	});
});

describe("the iOS action sheet bridge", () => {
	it("marks checked, disabled and destructive entries and adds Cancel", async () => {
		const { bridge, shown } = sheet(0);
		expect(bridge.isAvailable()).toBe(true);
		expect(await bridge.show(request)).toBe("done");
		expect(shown[0]).toEqual({
			options: ["✓ Done", "Later", "Move", "Delete", "Cancel"],
			cancelButtonIndex: 4,
			destructiveButtonIndex: [3],
			disabledButtonIndices: [1],
		});
	});

	it("opens a submenu as a further sheet", async () => {
		const { bridge, shown } = sheet(2, 0);
		expect(await bridge.show(request)).toBe("inbox");
		expect(shown[1]!.options).toEqual(["Inbox", "Cancel"]);
	});

	it("chooses nothing when cancelled", async () => {
		expect(await sheet(4).bridge.show(request)).toBeNull();
	});

	it("presents through the system action sheet", async () => {
		const { nativeMenuBridge } = await import("../src/ui/native-menu-bridge.ios");
		expect(await nativeMenuBridge.show(request)).toBe("done");
		expect(modules.sheet).toHaveBeenCalledTimes(1);
	});
});
