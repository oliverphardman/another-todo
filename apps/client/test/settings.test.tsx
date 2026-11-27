import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { microsoftAccessToken } from "./support/fake-microsoft";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	return app;
}

type App = Awaited<ReturnType<typeof start>>;

async function openSettings() {
	await act(async () => {
		fireEvent.click(screen.getByLabelText("Settings", { selector: "[role=button]" }));
	});
	return within(screen.getByRole("dialog", { name: "Settings" }));
}

const press = async (element: HTMLElement) => {
	await act(async () => {
		fireEvent.click(element);
	});
};

const checked = (element: HTMLElement) => element.getAttribute("aria-checked");

function addTask(title: string): void {
	const input = screen.getByLabelText("Add a Task");
	fireEvent.change(input, { target: { value: title } });
	fireEvent.keyDown(input, { key: "Enter" });
}

const follows = (first: Element, second: Element) =>
	(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("the settings window", () => {
	it("opens from the gear and closes from its button, the backdrop or Escape", async () => {
		await start();
		await press((await openSettings()).getByLabelText("Close settings"));
		expect(screen.queryByRole("dialog")).toBeNull();
		await openSettings();
		await press(screen.getByLabelText("Dismiss dialog"));
		expect(screen.queryByRole("dialog")).toBeNull();
		await openSettings();
		fireEvent.keyDown(window, { key: "Enter" });
		expect(screen.getByRole("dialog")).toBeTruthy();
		fireEvent.keyDown(window, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("fills a narrow screen", async () => {
		await start({ width: 400 });
		fireEvent.click(screen.getByLabelText("Show lists"));
		const settings = await openSettings();
		expect(screen.queryByLabelText("Dismiss dialog")).toBeNull();
		await press(settings.getByLabelText("Close settings"));
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("shows the server address without letting it be edited", async () => {
		await start();
		const field = (await openSettings()).getByLabelText("Server URL") as HTMLInputElement;
		expect(field.value).toBe("https://api.test");
		expect(field.readOnly).toBe(true);
	});

	it("ends with signing out", async () => {
		const app = await start();
		const settings = await openSettings();
		expect(settings.getAllByRole("button").at(-1)!.getAttribute("aria-label")).toBe("Sign out");
		await press(settings.getByLabelText("Sign out"));
		expect(app.container.auth.get()).toBe("signedOut");
	});
});

describe("appearance", () => {
	const rowHeight = (title: string) =>
		screen.getByText(title).closest<HTMLElement>("[data-task-row]")!.style.minHeight;

	it("previews and applies compact rows", async () => {
		const app = await start();
		act(() => app.container.store.select("tasks"));
		addTask("Water plants");
		expect(rowHeight("Water plants")).toBe("52px");
		const settings = await openSettings();
		const preview = within(settings.getByLabelText("Task style preview"));
		const task = within(settings.getByRole("radiogroup", { name: "Task style" }));
		expect(preview.getByLabelText("Open Example task").textContent).toBe("Example taskTasks·Today");
		expect(checked(task.getByLabelText("Cozy"))).toBe("true");
		expect(rowHeight("Example task")).toBe("52px");
		await press(task.getByLabelText("Compact"));
		expect(checked(task.getByLabelText("Compact"))).toBe("true");
		expect(rowHeight("Example task")).toBe("44px");
		expect(rowHeight("Water plants")).toBe("44px");
		fireEvent.click(preview.getByText("Example task"));
		fireEvent.click(preview.getByLabelText("Mark as completed", { selector: "[role=checkbox]" }));
		fireEvent.contextMenu(preview.getByText("Example task"));
		fireEvent.click(screen.getByLabelText("Close menu"));
		expect(app.container.store.get().tasks).toHaveLength(1);
		await press(task.getByLabelText("Cozy"));
		expect(rowHeight("Water plants")).toBe("52px");
	});

	it("sets compact text smaller throughout the list", async () => {
		const app = await start();
		act(() => app.container.store.select("tasks"));
		addTask("Water plants");
		const size = (text: string) => screen.getByText(text).style.fontSize;
		const heading = () => screen.getByRole("heading", { name: "Tasks" }).style.fontSize;
		expect([size("Water plants"), heading()]).toEqual(["15px", "28px"]);
		act(() => app.container.settings.change({ rowStyle: "compact" }));
		expect([size("Water plants"), heading()]).toEqual(["13px", "24px"]);
		expect(screen.getByLabelText("Add a Task").style.fontSize).toBe("13px");
	});

	it("previews and applies the menu style separately from the task style", async () => {
		const app = await start();
		const settings = await openSettings();
		const preview = settings.getByLabelText("Menu style preview");
		const menu = within(settings.getByRole("radiogroup", { name: "Menu style" }));
		const sidebar = () => screen.getByLabelText("Lists");
		const padding = (area: HTMLElement) =>
			area.querySelector<HTMLElement>('[aria-label="My Day"]')!.style.paddingLeft;
		expect(checked(menu.getByLabelText("Compact"))).toBe("true");
		expect(preview.textContent).toBe("My Day2Tasks9Groceries3");
		expect(padding(preview)).toBe("16px");
		await press(menu.getByLabelText("Cozy"));
		expect(checked(menu.getByLabelText("Cozy"))).toBe("true");
		expect(padding(preview)).toBe("24px");
		expect(padding(sidebar())).toBe("24px");
		expect(app.container.settings.get()).toMatchObject({ menuStyle: "cozy", rowStyle: "cozy" });
		fireEvent.click(within(preview).getByText("Tasks"));
		expect(app.container.store.get().selectedViewId).toBe("my-day");
		await press(menu.getByLabelText("Compact"));
		expect(padding(sidebar())).toBe("16px");
	});

	it("moves the add task bar below the list", async () => {
		const app = await start();
		act(() => app.container.store.select("tasks"));
		addTask("First");
		const bar = () => screen.getByLabelText("Add a Task");
		expect(follows(bar(), screen.getByText("First"))).toBe(true);
		const settings = await openSettings();
		await press(settings.getByLabelText("Bottom"));
		expect(follows(screen.getByText("First"), bar())).toBe(true);
		await press(settings.getByLabelText("Close settings"));
		addTask("Second");
		expect(screen.getByText("Second")).toBeTruthy();
		await press((await openSettings()).getByLabelText("Top"));
		expect(follows(bar(), screen.getByText("First"))).toBe(true);
	});

	it("keeps the bar at the bottom of a narrow screen too", async () => {
		const app = await start({ width: 400 });
		act(() => app.container.settings.change({ addTaskPosition: "bottom" }));
		addTask("Narrow");
		expect(follows(screen.getByText("Narrow"), screen.getByLabelText("Add a Task"))).toBe(true);
	});
});

describe("optional lists", () => {
	const row = (name: string) =>
		within(screen.getByLabelText("Lists")).queryByLabelText(name, { selector: "[role=button]" });

	it("hides and shows each smart list, leaving a hidden one for My Day", async () => {
		const app = await start();
		fireEvent.click(row("Planned")!);
		const settings = await openSettings();
		for (const name of ["All", "Important", "Planned", "Completed"]) {
			const box = settings.getByLabelText(name);
			expect(checked(box)).toBe("true");
			await press(box);
			expect(checked(box)).toBe("false");
			expect(row(name)).toBeNull();
		}
		expect(app.container.store.get().selectedViewId).toBe("my-day");
		expect(row("My Day")).toBeTruthy();
		expect(row("Tasks")).toBeTruthy();
		await press(settings.getByLabelText("Completed"));
		expect(row("Completed")).toBeTruthy();
	});

	it("lists finished tasks from everywhere under Completed", async () => {
		const app = await start();
		const store = app.container.store;
		act(() => {
			store.addList("Home");
			store.addTask("Swept");
			store.addTask("Pending");
		});
		act(() => store.toggleCompleted(store.get().tasks[0]!.id));
		fireEvent.click(row("Completed")!);
		expect(screen.getByText("Swept")).toBeTruthy();
		expect(screen.queryByText("Pending")).toBeNull();
		expect(screen.getByLabelText("Open Swept").textContent).toContain("Home");
		expect(screen.queryByLabelText("Add a Task")).toBeNull();
		expect(screen.queryByLabelText("Hide completed tasks")).toBeNull();
		fireEvent.click(screen.getByLabelText("List options"));
		expect(screen.queryByLabelText("Hide Completed Tasks")).toBeNull();
		expect(screen.getByLabelText("Print List")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Close menu"));
		fireEvent.click(screen.getByLabelText("Mark as not completed"));
		expect(screen.queryByText("Swept")).toBeNull();
	});
});

describe("My Day", () => {
	function seed(app: App) {
		const store = app.container.store;
		act(() => {
			store.select("tasks");
			const carried = store.addTask("Carried over")!;
			store.updateTask(carried, { myDay: "2026-11-18" });
			const due = store.addTask("Due now")!;
			store.setDueDay(due, store.today);
			store.select("my-day");
		});
		return store;
	}

	it("gathers yesterday's unfinished tasks under their own heading when enabled", async () => {
		const app = await start();
		const store = seed(app);
		expect(screen.queryByText("Carried over")).toBeNull();
		const settings = await openSettings();
		await press(settings.getByLabelText("Enable Yesterday"));
		expect(screen.getByText("Yesterday")).toBeTruthy();
		expect(follows(screen.getByText("Yesterday"), screen.getByText("Carried over"))).toBe(true);
		expect(follows(screen.getByText("Due now"), screen.getByText("Yesterday"))).toBe(true);
		fireEvent.click(screen.getByLabelText("Hide yesterday's tasks"));
		expect(screen.queryByText("Carried over")).toBeNull();
		fireEvent.click(screen.getByLabelText("Show yesterday's tasks"));
		fireEvent.click(screen.getByLabelText("Open Due now"));
		fireEvent.click(screen.getByLabelText("Open Carried over"), { shiftKey: true });
		expect(store.get().selectedTaskIds).toHaveLength(2);
		act(() =>
			store.setInMyDay([store.get().tasks.find((t) => t.title === "Carried over")!.id], true),
		);
		expect(screen.queryByText("Yesterday")).toBeNull();
		expect(screen.getByText("Carried over")).toBeTruthy();
	});

	it("can leave tasks that are only due today out", async () => {
		const app = await start();
		const store = seed(app);
		expect(screen.getByText("Due now")).toBeTruthy();
		const settings = await openSettings();
		const box = settings.getByLabelText("Show 'Due Today' tasks in My Day");
		await press(box);
		expect(screen.queryByText("Due now")).toBeNull();
		const due = store.get().tasks.find((task) => task.title === "Due now")!;
		expect(store.isInMyDay(due)).toBe(false);
		act(() => store.toggleMyDay(due.id));
		expect(screen.getByText("Due now")).toBeTruthy();
		await press(box);
		expect(checked(box)).toBe("true");
	});
});

describe("Microsoft To Do settings", () => {
	const RECEIVE = "Receive tasks and updates from To Do";
	const SEND = "Send tasks and updates to To Do";
	const SIGN_IN = "Sign out then sign in with a Microsoft account to use these features";
	const microsoft = { accessToken: microsoftAccessToken() };

	it("are greyed out without a Microsoft account", async () => {
		const app = await start();
		const settings = await openSettings();
		expect(settings.getByText(SIGN_IN)).toBeTruthy();
		for (const name of [RECEIVE, SEND]) {
			const box = settings.getByLabelText(name);
			expect(box.getAttribute("aria-disabled")).toBe("true");
			expect(checked(box)).toBe("false");
			await press(box);
		}
		expect((settings.getByLabelText("Minutes between syncs") as HTMLInputElement).readOnly).toBe(
			true,
		);
		expect(app.microsoftAuthorizer.authorizeCalls).toBe(0);
		expect(app.container.settings.get().microsoft.receive).toBe(true);
	});

	it("explain when this app cannot sync at all", async () => {
		await start({ ...microsoft, microsoftAvailable: false });
		const settings = await openSettings();
		expect(
			settings.getByText("These features are not available here. Use a desktop or mobile app."),
		).toBeTruthy();
	});

	it("connect in the chosen direction, then switch each direction on its own", async () => {
		const app = await start(microsoft);
		await press(screen.getByLabelText("Not now"));
		const accept = vi.spyOn(app.container.microsoft, "accept");
		const settings = await openSettings();
		expect(settings.queryByText(SIGN_IN)).toBeNull();
		await press(settings.getByLabelText(RECEIVE));
		expect(accept).toHaveBeenCalledTimes(1);
		await vi.waitFor(() => expect(checked(settings.getByLabelText(RECEIVE))).toBe("true"));
		expect(checked(settings.getByLabelText(SEND))).toBe("false");
		await press(settings.getByLabelText(SEND));
		await press(settings.getByLabelText(RECEIVE));
		expect(app.container.settings.get().microsoft).toMatchObject({ receive: false, send: true });
		expect(accept).toHaveBeenCalledTimes(1);
	});

	it("connects for sending alone", async () => {
		const app = await start(microsoft);
		await press(screen.getByLabelText("Not now"));
		const settings = await openSettings();
		await press(settings.getByLabelText(SEND));
		expect(app.container.settings.get().microsoft).toMatchObject({ receive: false, send: true });
	});

	it("takes a whole number of minutes", async () => {
		const app = await start(microsoft);
		await press(screen.getByLabelText("Not now"));
		const settings = await openSettings();
		const field = settings.getByLabelText("Minutes between syncs") as HTMLInputElement;
		const enter = (value: string) => {
			fireEvent.change(field, { target: { value } });
			fireEvent.keyDown(field, { key: "Enter" });
		};
		expect(field.value).toBe("2");
		enter("1x5");
		expect(app.container.settings.get().microsoft.intervalMinutes).toBe(15);
		enter("");
		expect(field.value).toBe("15");
		fireEvent.change(field, { target: { value: "0" } });
		fireEvent.blur(field);
		expect(app.container.settings.get().microsoft.intervalMinutes).toBe(1);
		expect(field.value).toBe("1");
		enter("99999");
		expect(field.value).toBe("1440");
	});

	it("ignores the answer once the window has closed", async () => {
		const app = await start(microsoft);
		await press(screen.getByLabelText("Not now"));
		let answer!: (value: "eligible") => void;
		vi.spyOn(app.container.microsoft, "eligibility").mockReturnValue(
			new Promise((resolve) => (answer = resolve)),
		);
		const settings = await openSettings();
		await press(settings.getByLabelText("Close settings"));
		await act(async () => answer("eligible"));
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});
