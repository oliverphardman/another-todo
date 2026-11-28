import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DesktopMenuBridge } from "../src/ui/desktop-menu-bridge";
import { nativeMenuBridge as macBridge } from "../src/ui/native-menu-bridge.macos";
import { nativeMenuBridge as windowsBridge } from "../src/ui/native-menu-bridge.windows";
import { nativeMenuBridge as defaultBridge } from "../src/ui/native-menu-bridge";
import {
	NativeMenu,
	type NativeMenuBridge,
	type NativeMenuItem,
	type NativeMenuRequest,
} from "../src/ui/native-menu";
import type { ContextMenuEntry } from "../src/ui/context-menu";
import { IconArtwork } from "../src/ui/icon-artwork";
import { renderApp } from "./support/render-app";

class FakeBridge implements NativeMenuBridge {
	shown: NativeMenuItem[][] = [];
	positions: { x: number; y: number }[] = [];
	choose: (items: readonly NativeMenuItem[]) => string | null = () => null;
	failure: Error | null = null;

	isAvailable(): boolean {
		return true;
	}

	cancelLabels: string[] = [];

	async show({ items, x, y, cancelLabel }: NativeMenuRequest): Promise<string | null> {
		this.cancelLabels.push(cancelLabel);
		this.shown.push([...items]);
		this.positions.push({ x, y });
		if (this.failure !== null) {
			throw this.failure;
		}
		return this.choose(items);
	}
}

const original = NativeMenu.bridge;
let stop: (() => void) | undefined;

beforeEach(() => {
	NativeMenu.bridge = new FakeBridge();
});

afterEach(() => {
	NativeMenu.bridge = original;
	stop?.();
	stop = undefined;
	cleanup();
});

const fake = () => NativeMenu.bridge as FakeBridge;
const flat = (items: readonly NativeMenuItem[]): NativeMenuItem[] =>
	items.flatMap((item) => [item, ...flat(item.children ?? [])]);

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	return app;
}

type App = Awaited<ReturnType<typeof start>>;

function mutate<T>(app: App, change: (store: App["container"]["store"]) => T): T {
	let result!: T;
	act(() => {
		result = change(app.container.store);
	});
	return result;
}

describe("NativeMenu items", () => {
	const entries: ContextMenuEntry[] = [
		{ kind: "action", key: "a", glyph: "check", label: "A", onPress: () => undefined },
		{
			kind: "action",
			key: "b",
			glyph: "trash",
			label: "B",
			separatorBefore: true,
			danger: true,
			disabled: true,
			checked: true,
			onPress: () => undefined,
		},
		{
			kind: "submenu",
			key: "c",
			glyph: "move",
			label: "C",
			separatorBefore: true,
			entries: [{ kind: "action", key: "d", glyph: "list", label: "D", onPress: () => undefined }],
		},
		{ kind: "panel", key: "e", glyph: "calendar", label: "E", render: () => null },
		{
			kind: "panel",
			key: "f",
			glyph: "calendar",
			label: "F",
			separatorBefore: true,
			render: () => null,
		},
	];

	it("maps entries, separators and submenus to native items", () => {
		expect(NativeMenu.items(entries)).toEqual([
			{ key: "a", label: "A", kind: "action", disabled: false, destructive: false, checked: false },
			{ key: "b-separator", label: "", kind: "separator" },
			{ key: "b", label: "B", kind: "action", disabled: true, destructive: true, checked: true },
			{ key: "c-separator", label: "", kind: "separator" },
			{
				key: "c",
				label: "C",
				kind: "submenu",
				children: [
					{
						key: "d",
						label: "D",
						kind: "action",
						disabled: false,
						destructive: false,
						checked: false,
					},
				],
			},
			{ key: "e", label: "E", kind: "action" },
			{ key: "f-separator", label: "", kind: "separator" },
			{ key: "f", label: "F", kind: "action" },
		]);
	});

	it("illustrates every entry but the separators when icons are wanted", () => {
		const items = flat(NativeMenu.items(entries, { icons: true }));
		for (const item of items) {
			expect(item.icon).toBe(
				item.kind === "separator"
					? undefined
					: IconArtwork.svg(NativeMenu.find(entries, item.key)!.glyph),
			);
		}
		expect(items.filter((item) => item.icon !== undefined)).toHaveLength(6);
	});

	it("finds entries, including nested ones", () => {
		expect(NativeMenu.find(entries, "a")!.label).toBe("A");
		expect(NativeMenu.find(entries, "d")!.label).toBe("D");
		expect(NativeMenu.find(entries, "ghost")).toBeNull();
	});
});

describe("bridges", () => {
	it("are unavailable by default and on platforms without the native module", async () => {
		expect(defaultBridge.isAvailable()).toBe(false);
		expect(await defaultBridge.show({ items: [], x: 0, y: 0, cancelLabel: "" })).toBeNull();
		expect(macBridge.isAvailable()).toBe(false);
		expect(windowsBridge.isAvailable()).toBe(false);
	});

	it("forward to the native module when it exists", async () => {
		const calls: unknown[] = [];
		const bridge = new DesktopMenuBridge({
			show: async (items, x, y) => {
				calls.push([items, x, y]);
				return "picked";
			},
		});
		expect(bridge.isAvailable()).toBe(true);
		const items: NativeMenuItem[] = [{ key: "a", label: "A", kind: "action" }];
		expect(await bridge.show({ items, x: 3, y: 4, cancelLabel: "Cancel" })).toBe("picked");
		expect(calls).toEqual([[[{ key: "a", label: "A", kind: "action" }], 3, 4]]);
		expect(new DesktopMenuBridge(null).isAvailable()).toBe(false);
	});
});

describe("native menu icons", () => {
	it("puts the app menu entries after the system's Settings item", () => {
		const source = readFileSync("macos/AnotherToDoMenu/AnotherToDoMenu.mm", "utf8");
		expect(source).toContain('[item.keyEquivalent isEqualToString:@","]');
		expect(source).toContain("[self indexAfterSettingsIn:application]");
	});

	it("hands the macOS menu each icon as a template image", () => {
		const source = readFileSync("macos/AnotherToDoMenu/AnotherToDoMenu.mm", "utf8");
		expect(source).toContain('[self illustrate:entry markup:item[@"icon"]];');
		expect(source).toContain("[icon setTemplate:YES];");
		expect(source).toContain('[entry setValue:@1 forKey:@"preferredImageVisibility"];');
	});

	it("groups and illustrates the list menu as Microsoft To Do does", async () => {
		const app = await start();
		mutate(app, (store) => store.addList("Errands"));
		fireEvent.contextMenu(screen.getByLabelText("Errands"));
		await waitFor(() => expect(fake().shown).toHaveLength(1));
		const items = fake().shown[0]!;
		const sections = items
			.map((item) => (item.kind === "separator" ? "|" : item.label))
			.join(",")
			.split(",|,");
		expect(sections[0]!.startsWith("Create Group,")).toBe(true);
		expect(sections.slice(1)).toEqual([
			"Share List,Rename List,Print List,Export List…",
			"Delete List",
		]);
		const icon = (label: string) => items.find((item) => item.label === label)!.icon;
		expect(icon("Create Group")).toBe(IconArtwork.svg("group"));
		expect(icon("Share List")).toBe(IconArtwork.svg("addPerson"));
		expect(icon("Rename List")).toBe(IconArtwork.svg("rename"));
		expect(icon("Print List")).toBe(IconArtwork.svg("print"));
		expect(icon("Export List…")).toBe(IconArtwork.svg("export"));
		expect(icon("Delete List")).toBe(IconArtwork.svg("trash"));
	});
});

describe("sort menu icons", () => {
	const expected = [
		["Importance", "star"],
		["Alphabetically", "arrowsUpDown"],
		["Due Date", "dueDate"],
		["Creation Date", "createdDate"],
		["Added to My Day", "sun"],
	] as const;

	it("gives each native sort option its own icon", async () => {
		await start();
		fireEvent.click(screen.getByLabelText("List options"));
		await waitFor(() => expect(fake().shown).toHaveLength(1));
		const sort = fake().shown[0]!.find((item) => item.label === "Sort")!;
		expect(sort.children!.map((item) => [item.label, item.icon])).toEqual(
			expected.map(([label, glyph]) => [label, IconArtwork.svg(glyph)]),
		);
	});
});

describe("native context menus", () => {
	async function withTask() {
		const app = await start();
		const store = app.container.store;
		mutate(app, (s) => {
			s.select("tasks");
			s.addTask("Solo");
		});
		fireEvent.click(screen.getByLabelText("Tasks"));
		return { app, store };
	}

	it("shows the task menu natively at the pointer and runs the chosen action", async () => {
		const { store } = await withTask();
		fake().choose = (items) => items.find((item) => item.label === "Mark as Important")!.key;
		fireEvent.contextMenu(screen.getByLabelText("Open Solo"), { clientX: 120, clientY: 80 });
		await waitFor(() => expect(store.get().tasks[0]!.important).toBe(true));
		expect(fake().positions[0]).toEqual({ x: 120, y: 80 });
		expect(fake().cancelLabels[0]).toBe("Cancel");
		expect(screen.queryByRole("menu")).toBeNull();
		const labels = flat(fake().shown[0]!).map((item) => item.label);
		expect(labels).toContain("Move Task to…");
		expect(labels).toContain("Delete Task");
	});

	it("opens panel entries such as the date picker in the app after a native choice", async () => {
		await withTask();
		fake().choose = (items) => items.find((item) => item.label === "Pick a date")!.key;
		fireEvent.contextMenu(screen.getByLabelText("Open Solo"), { clientX: 60, clientY: 60 });
		expect(await screen.findByLabelText("Due date options")).toBeTruthy();
	});

	it("does nothing when the menu is dismissed or the key is unknown, and falls back when it fails", async () => {
		const { store } = await withTask();
		fireEvent.contextMenu(screen.getByLabelText("Open Solo"));
		await waitFor(() => expect(fake().shown).toHaveLength(1));
		fake().choose = () => "ghost";
		fireEvent.contextMenu(screen.getByLabelText("Open Solo"));
		await waitFor(() => expect(fake().shown).toHaveLength(2));
		expect(store.get().tasks[0]!.important).toBe(false);
		fake().failure = new Error("no native menu");
		fireEvent.contextMenu(screen.getByLabelText("Open Solo"));
		expect(await screen.findByRole("menu", { name: "Task options" })).toBeTruthy();
	});

	it("shows the list options natively from the meatball button", async () => {
		const app = await start();
		mutate(app, (s) => {
			s.addList("Mine");
		});
		fake().choose = (items) => flat(items).find((item) => item.label === "Alphabetically")!.key;
		fireEvent.click(screen.getByLabelText("List options"));
		await waitFor(() =>
			expect(app.container.store.settingsFor(app.container.store.selectedView.id).sort).toBe(
				"alphabetical",
			),
		);
		const labels = flat(fake().shown[0]!).map((item) => item.label);
		for (const expected of [
			"Rename List",
			"Sort",
			"Change Theme…",
			"Duplicate List",
			"Print List",
			"Hide Completed Tasks",
			"Delete List",
		]) {
			expect(labels).toContain(expected);
		}
		fake().choose = (items) => items.find((item) => item.label === "Hide Completed Tasks")!.key;
		fireEvent.click(screen.getByLabelText("List options"));
		await waitFor(() =>
			expect(
				app.container.store.settingsFor(app.container.store.selectedView.id).hideCompleted,
			).toBe(true),
		);
	});

	it("offers fewer options on built-in lists and lists shared with you", async () => {
		const app = await start();
		mutate(app, (s) => s.select("important"));
		fireEvent.click(screen.getByLabelText("List options"));
		await waitFor(() => expect(fake().shown).toHaveLength(1));
		const builtIn = flat(fake().shown[0]!).map((item) => item.label);
		expect(builtIn).not.toContain("Duplicate List");
		expect(builtIn).not.toContain("Delete List");
		expect(builtIn).toContain("Print List");
		act(() => {
			void app.container.database.apply((snapshot) => ({
				...snapshot,
				lists: [
					...snapshot.lists,
					{
						id: "theirs",
						name: "Theirs",
						createdAt: "2026-11-01T00:00:00.000Z",
						owned: false,
						shared: true,
					},
				],
			}));
		});
		mutate(app, (s) => s.select("theirs"));
		fireEvent.click(screen.getByLabelText("List options"));
		await waitFor(() => expect(fake().shown).toHaveLength(2));
		const shared = flat(fake().shown[1]!).map((item) => item.label);
		expect(shared).toContain("Leave List");
		expect(shared).not.toContain("Share List");
		expect(shared).not.toContain("Rename List");
	});

	it("runs every list option chosen from the native menu", async () => {
		const app = await start();
		const store = app.container.store;
		mutate(app, (s) => {
			s.addList("Mine");
		});
		const pick = async (label: string, assertion: () => void) => {
			fake().choose = (items) => flat(items).find((item) => item.label === label)!.key;
			fireEvent.click(screen.getByLabelText("List options"));
			await waitFor(assertion);
		};
		await pick("Sort", () => expect(fake().shown.length).toBe(1));
		await pick("Importance", () =>
			expect(
				store.settingsFor("my-day").sort === "importance" ||
					store.settingsFor(store.selectedView.id).sort === "importance",
			).toBe(true),
		);
		await pick("Importance", () =>
			expect(store.settingsFor(store.selectedView.id).sort).toBeNull(),
		);
		await pick("Hide Completed Tasks", () =>
			expect(store.settingsFor(store.selectedView.id).hideCompleted).toBe(true),
		);
		await pick("Show Completed Tasks", () =>
			expect(store.settingsFor(store.selectedView.id).hideCompleted).toBe(false),
		);
		await pick("Change Theme…", () => expect(screen.getByLabelText("Close theme")).toBeTruthy());
		fireEvent.click(screen.getByLabelText("Close theme"));
		await pick("Print List", () => expect(app.printer.documents).toHaveLength(1));
		const renaming: (string | null)[] = [];
		store.subscribe(() => renaming.push(store.get().renamingViewId));
		await pick("Rename List", () => expect(renaming.some((id) => id !== null)).toBe(true));
		act(() => store.stopRenaming());
		await pick("Duplicate List", () => expect(store.get().lists).toHaveLength(2));
		await pick("Delete List", () => expect(screen.getByRole("alert")).toBeTruthy());
		await act(
			async () =>
				void fireEvent.click(within(screen.getByRole("alert")).getByLabelText("Delete list")),
		);
		expect(store.get().lists).toHaveLength(1);
	});
});
