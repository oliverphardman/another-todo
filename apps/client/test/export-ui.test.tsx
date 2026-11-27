import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { BackHandler, Platform } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TodoStore } from "../src/state/todo-store";
import { MenuBar, type MenuBarBridge } from "../src/ui/menu-bar";
import { NativeSettings, type NativeSettingsChange } from "../src/ui/native-settings";
import type { NativeMenuItem } from "../src/ui/native-menu";
import { renderApp } from "./support/render-app";

const originalMenuBar = MenuBar.bridge;
const originalSettings = NativeSettings.bridge;
const originalPlatform = Platform.OS;
let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	MenuBar.bridge = originalMenuBar;
	NativeSettings.bridge = originalSettings;
	Platform.OS = originalPlatform;
	vi.restoreAllMocks();
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	await act(async () => undefined);
	return app;
}

type App = Awaited<ReturnType<typeof start>>;

function seed(app: App) {
	const store: TodoStore = app.container.store;
	const ids = { home: "", work: "", report: "" };
	act(() => {
		ids.home = store.addList("Home")!;
		ids.work = store.addList("Work")!;
		store.createGroupFor(ids.work, "Office");
		store.stopRenamingGroup();
		ids.report = store.addList("Reports")!;
		store.setListGroup(ids.report, store.get().groups[0]!.id);
		store.newGroup("Empty");
		store.stopRenamingGroup();
		store.select(ids.home);
		store.addTask("Sweep");
		store.select(ids.work);
		const email = store.addTask("Email")!;
		store.setImportant([email], true);
		const filed = store.addTask("Filed")!;
		store.toggleCompleted(filed);
		store.updateSettings(ids.work, { hideCompleted: true });
		store.select("tasks");
		store.addTask("Loose");
	});
	return ids;
}

const dialog = () => screen.getByRole("dialog", { name: "Export" });
const within_ = () => within(dialog());
const box = (name: string) => within_().getByRole("checkbox", { name });
const checked = (name: string) => box(name).getAttribute("aria-checked");
const click = (element: HTMLElement) => act(async () => void fireEvent.click(element));
const confirm = () => click(within_().getByRole("button", { name: "Export" }));

async function openFromListMenu() {
	await click(screen.getByLabelText("List options"));
	await click(screen.getByLabelText("Export List…"));
}

async function openFromSettings() {
	await click(screen.getByLabelText("Settings"));
	await click(screen.getByRole("button", { name: "Export lists…" }));
}

describe("exporting from the list menu", () => {
	it("saves only the current list by default, completed tasks included", async () => {
		const app = await start();
		const ids = seed(app);
		act(() => app.container.store.select(ids.work));
		await openFromListMenu();
		expect(checked("Export current list only")).toBe("true");
		expect(
			within_()
				.getAllByRole("radio")
				.map((radio) => radio.getAttribute("aria-label")),
		).toEqual(["CSV", "XLSX", "JSON", "PDF"]);
		await confirm();
		const [file] = app.exports.files;
		expect([file!.name, file!.contentType]).toEqual(["Work.csv", "text/csv"]);
		expect(file!.text).toContain("Office,Work,Email");
		expect(file!.text).toContain("Office,Work,Filed,Yes");
		expect(file!.text).not.toContain("Sweep");
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("saves every list when the box is cleared", async () => {
		const app = await start({ width: 400 });
		seed(app);
		await openFromListMenu();
		await click(box("Export current list only"));
		await click(within_().getByRole("radio", { name: "JSON" }));
		await confirm();
		const [file] = app.exports.files;
		expect(file!.name).toBe("Another To Do.json");
		const { lists } = JSON.parse(file!.text) as {
			lists: { name: string; group: string | null }[];
		};
		expect(lists.map((list) => [list.name, list.group])).toEqual([
			["Tasks", null],
			["Home", null],
			["Work", "Office"],
			["Reports", "Office"],
		]);
	});

	it("exports what a smart list shows, naming each task's own list", async () => {
		const app = await start();
		seed(app);
		act(() => app.container.store.select("important"));
		await openFromListMenu();
		await confirm();
		const [file] = app.exports.files;
		expect(file!.name).toBe("Important.csv");
		expect(file!.text).toContain("Office,Work,Email");
		expect(file!.text).not.toContain("Loose");
	});

	it("passes My Day's date to the PDF", async () => {
		const app = await start();
		act(() => void app.container.store.addTask("Today"));
		await openFromListMenu();
		await click(within_().getByRole("radio", { name: "PDF" }));
		await confirm();
		expect(app.exports.books[0]!.lists[0]!.subtitle).toBe("Thursday, November 19");
		expect(app.exports.files[0]!.name).toBe("My Day.pdf");
	});

	it("is offered when right-clicking a list, for that list", async () => {
		const app = await start();
		seed(app);
		await act(async () => void fireEvent.contextMenu(screen.getByLabelText("Home")));
		await click(screen.getByRole("menuitem", { name: "Export List…" }));
		await confirm();
		expect(app.exports.files[0]!.name).toBe("Home.csv");
	});

	it("is offered for a list shared with you", async () => {
		const app = await start();
		await act(async () => {
			await app.container.database.apply((snapshot) => ({
				...snapshot,
				lists: [{ id: "theirs", name: "Theirs", createdAt: "x", owned: false, shared: true }],
			}));
		});
		await act(async () => void fireEvent.contextMenu(screen.getByLabelText("Theirs")));
		await click(screen.getByRole("menuitem", { name: "Export List…" }));
		expect(dialog()).toBeTruthy();
	});

	it("stays open when the save dialog is cancelled and reports failures", async () => {
		const app = await start();
		await openFromListMenu();
		app.exports.outcome = "cancelled";
		await confirm();
		expect(dialog()).toBeTruthy();
		expect(screen.queryByText("The export could not be saved. Try again.")).toBeNull();
		app.exports.outcome = new Error("disk full");
		await confirm();
		expect(screen.getByText("The export could not be saved. Try again.")).toBeTruthy();
		app.exports.outcome = "saved";
		await confirm();
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("saves once while busy and ignores a save that ends after closing", async () => {
		const app = await start();
		let finish: (outcome: "saved") => void = () => undefined;
		const save = vi
			.spyOn(app.exports, "save")
			.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
		await openFromListMenu();
		await confirm();
		await act(async () => void fireEvent.keyDown(window, { key: "Enter" }));
		expect(save).toHaveBeenCalledTimes(1);
		await click(within_().getByRole("button", { name: "Cancel" }));
		await openFromListMenu();
		await act(async () => finish("saved"));
		expect(dialog()).toBeTruthy();
	});

	it("takes Enter and Escape, and closes from outside", async () => {
		const app = await start();
		await openFromListMenu();
		await act(async () => void fireEvent.keyDown(window, { key: "Escape" }));
		expect(screen.queryByRole("dialog")).toBeNull();
		await openFromListMenu();
		await click(screen.getByLabelText("Dismiss dialog"));
		expect(screen.queryByRole("dialog")).toBeNull();
		await openFromListMenu();
		await act(async () => void fireEvent.keyDown(window, { key: "Enter" }));
		expect(app.exports.files).toHaveLength(1);
	});

	it("closes with Android's back button", async () => {
		Platform.OS = "android";
		const handlers: (() => boolean | null | undefined)[] = [];
		vi.spyOn(BackHandler, "addEventListener").mockImplementation((_, handler) => {
			handlers.push(handler);
			return { remove: () => undefined };
		});
		await start({ width: 400 });
		await openFromListMenu();
		await act(async () => void handlers.at(-1)!());
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("is hidden where files cannot be saved", async () => {
		const app = await start();
		app.exports.available = false;
		const ids = seed(app);
		await click(screen.getByLabelText("List options"));
		expect(screen.queryByLabelText("Export List…")).toBeNull();
		await click(screen.getByLabelText("Close menu"));
		act(() => app.container.store.select(ids.home));
		await act(async () => void fireEvent.contextMenu(screen.getByLabelText("Home")));
		expect(screen.queryByRole("menuitem", { name: "Export List…" })).toBeNull();
		await click(screen.getByLabelText("Settings"));
		expect(screen.queryByRole("button", { name: "Export lists…" })).toBeNull();
	});
});

describe("exporting from settings", () => {
	it("lists every list under its group with nothing chosen", async () => {
		const app = await start();
		seed(app);
		await openFromSettings();
		expect(
			within_()
				.getAllByRole("checkbox")
				.map((entry) => entry.getAttribute("aria-label")),
		).toEqual(["Select all", "Tasks", "Home", "Group Office", "Work", "Reports"]);
		expect(checked("Select all")).toBe("false");
		expect(box("Group Office").textContent).toBe("Office");
		expect(within_().getByRole("button", { name: "Export" }).getAttribute("aria-disabled")).toBe(
			"true",
		);
		await act(async () => void fireEvent.keyDown(window, { key: "Enter" }));
		expect(app.exports.files).toEqual([]);
	});

	it("selects and clears everything at once", async () => {
		const app = await start();
		seed(app);
		await openFromSettings();
		await click(box("Select all"));
		for (const name of ["Select all", "Tasks", "Home", "Group Office", "Work", "Reports"]) {
			expect(checked(name)).toBe("true");
		}
		await click(box("Select all"));
		expect(checked("Reports")).toBe("false");
	});

	it("shows partial choices and toggles a whole group", async () => {
		const app = await start();
		seed(app);
		await openFromSettings();
		await click(box("Work"));
		expect(checked("Group Office")).toBe("mixed");
		expect(checked("Select all")).toBe("mixed");
		await click(box("Group Office"));
		expect(checked("Reports")).toBe("true");
		await click(box("Group Office"));
		expect(checked("Work")).toBe("false");
		await click(box("Home"));
		await confirm();
		expect(app.exports.files[0]!.name).toBe("Home.csv");
		expect(app.exports.files[0]!.text).toContain("Sweep");
		expect(app.exports.files[0]!.text).not.toContain("Email");
		expect(screen.getByRole("dialog", { name: "Settings" })).toBeTruthy();
	});

	it("is a button in the macOS settings window", async () => {
		Platform.OS = "macos";
		let change: (value: NativeSettingsChange) => void = () => undefined;
		const rows: string[] = [];
		NativeSettings.bridge = {
			isAvailable: () => true,
			show: (model) => {
				const entries = model.sections.flatMap((section) => section.rows);
				rows.push(...entries.map((row) => `${row.kind}:${row.label}`));
			},
			nextChange: () => new Promise((resolve) => (change = resolve)),
		};
		await start();
		expect(rows).toContain("action:Export lists…");
		await act(async () => change({ key: "export", value: "" }));
		expect(box("Select all")).toBeTruthy();
	});

	it("leaves the macOS window alone where files cannot be saved", async () => {
		Platform.OS = "macos";
		const sections: string[] = [];
		NativeSettings.bridge = {
			isAvailable: () => true,
			show: (model) => {
				sections.push(...model.sections.map((section) => section.key));
			},
			nextChange: () => new Promise(() => undefined),
		};
		const app = await start();
		app.exports.available = false;
		sections.length = 0;
		act(() => app.container.settings.change({ rowStyle: "compact" }));
		expect(sections).not.toContain("export");
		expect(sections).toContain("myDay");
	});
});

describe("exporting from the macOS menu bar", () => {
	it("is left out where files cannot be saved", async () => {
		let shown: readonly NativeMenuItem[] = [];
		MenuBar.bridge = {
			isAvailable: () => true,
			show: (menus) => {
				shown = menus;
			},
			nextSelection: () => new Promise(() => undefined),
		};
		const app = await start();
		app.exports.available = false;
		act(() => void app.container.store.addList("Home"));
		const list = shown.find((menu) => menu.label === "List")!;
		expect(list.children!.map((item) => item.label)).not.toContain("Export List…");
	});

	it("is in the List menu, once, for the current list", async () => {
		let shown: readonly NativeMenuItem[] = [];
		let choose: (key: string) => void = () => undefined;
		const bridge: MenuBarBridge = {
			isAvailable: () => true,
			show: (menus) => (shown = menus),
			nextSelection: () => new Promise((resolve) => (choose = resolve)),
		};
		MenuBar.bridge = bridge;
		const app = await start();
		const ids = seed(app);
		act(() => app.container.store.select(ids.home));
		const labels = shown.find((menu) => menu.label === "List")!.children!.map((item) => item.label);
		expect(labels.filter((label) => label === "Export List…")).toHaveLength(1);
		await act(async () => choose("list/export"));
		expect(checked("Export current list only")).toBe("true");
		await confirm();
		expect(app.exports.files[0]!.name).toBe("Home.csv");
	});
});
