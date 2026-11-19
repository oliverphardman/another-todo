import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	return app;
}

function addTask(title: string): void {
	const input = screen.getByLabelText("Add a task");
	fireEvent.change(input, { target: { value: title } });
	fireEvent.keyDown(input, { key: "Enter" });
}

describe("signed out", () => {
	it("offers sign in and the configured providers", async () => {
		const app = await start({ signedIn: false, providers: ["Microsoft", "Google"] });
		expect(screen.getByRole("heading", { name: "Another To Do" })).toBeTruthy();
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Sign in"));
		});
		expect(app.authorizationServer.authorizeCalls).toEqual([undefined]);
	});

	it("starts the provider specific flow", async () => {
		const app = await start({ signedIn: false, providers: ["Microsoft", "Google"] });
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Continue with Google"));
		});
		expect(app.authorizationServer.authorizeCalls).toEqual(["Google"]);
	});

	it("shows a loading state until the session is restored", async () => {
		const { container, unmount } = await (async () => {
			const app = await renderApp({ signedIn: false, restore: false });
			return { container: app.container, unmount: app.unmount };
		})();
		unmount();
		expect(container.auth.get()).toBe("loading");
	});
});

describe("expanded layout", () => {
	it("shows the sidebar, an empty list and the smart views", async () => {
		await start();
		for (const name of ["My Day", "Important", "Planned", "All tasks", "Tasks"]) {
			expect(screen.getByLabelText(name)).toBeTruthy();
		}
		expect(screen.getByText("No tasks here yet")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "My Day" })).toBeTruthy();
		expect(screen.getByText("Thursday, November 19")).toBeTruthy();
	});

	it("adds, completes and stars tasks", async () => {
		await start();
		addTask("Buy milk");
		addTask("Call mum");
		expect(screen.getByText("Buy milk")).toBeTruthy();
		expect((screen.getByLabelText("Add a task") as HTMLInputElement).value).toBe("");
		fireEvent.click(screen.getAllByLabelText("Mark as completed")[0]!);
		expect(screen.getByText("Completed 1")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Hide completed tasks"));
		expect(screen.queryByLabelText("Mark as not completed")).toBeNull();
		fireEvent.click(screen.getByLabelText("Show completed tasks"));
		expect(screen.getAllByLabelText("Mark as not completed")).toHaveLength(1);
		fireEvent.click(screen.getAllByLabelText("Mark as important")[0]!);
		fireEvent.click(screen.getByLabelText("Important"));
		expect(screen.getAllByLabelText("Remove importance")).toHaveLength(1);
	});

	it("plays the completion sound when a task is completed from the list or the details", async () => {
		const app = await start();
		addTask("Sound check");
		fireEvent.click(screen.getByLabelText("Mark as completed"));
		expect(app.sounds.plays).toBe(1);
		fireEvent.click(screen.getByLabelText("Mark as not completed"));
		expect(app.sounds.plays).toBe(1);
		fireEvent.click(screen.getByLabelText("Open Sound check"));
		fireEvent.click(
			within(screen.getByLabelText("Task details")).getByLabelText("Mark as completed"),
		);
		expect(app.sounds.plays).toBe(2);
	});

	it("uses the Add button and ignores blank titles", async () => {
		await start();
		const input = screen.getByLabelText("Add a task");
		fireEvent.change(input, { target: { value: "   " } });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(screen.getByText("No tasks here yet")).toBeTruthy();
		fireEvent.change(input, { target: { value: "From button" } });
		fireEvent.click(screen.getByLabelText("Add"));
		expect(screen.getByText("From button")).toBeTruthy();
	});

	it("edits a task in the detail pane", async () => {
		const app = await start();
		addTask("Draft report");
		fireEvent.click(screen.getByLabelText("Open Draft report"));
		const details = within(screen.getByLabelText("Task details"));
		const title = details.getByLabelText("Task title");
		fireEvent.change(title, { target: { value: "Final report" } });
		fireEvent.blur(title);
		expect(screen.getAllByText("Final report").length).toBeGreaterThan(0);
		fireEvent.change(title, { target: { value: "Final report v2" } });
		fireEvent.keyDown(title, { key: "Enter" });
		expect(app.container.store.get().tasks[0]!.title).toBe("Final report v2");
		fireEvent.click(details.getByLabelText("Mark as important"));
		fireEvent.click(details.getByLabelText("Mark as completed"));
		expect(app.container.store.get().tasks[0]).toMatchObject({ completed: true });
		fireEvent.click(details.getByLabelText("Close details"));
		expect(screen.queryByLabelText("Task details")).toBeNull();
	});

	it("sets, changes and removes due dates", async () => {
		const app = await start();
		addTask("Pay rent");
		fireEvent.click(screen.getByLabelText("Open Pay rent"));
		fireEvent.click(screen.getByLabelText("Add due date"));
		fireEvent.click(screen.getByLabelText("Due Tomorrow"));
		expect(app.container.store.get().tasks[0]!.dueDay).toBe("2026-11-20");
		expect(screen.getByLabelText("Due Tomorrow")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Due Tomorrow"));
		fireEvent.click(screen.getByLabelText("Due Today"));
		expect(app.container.store.get().tasks[0]!.dueDay).toBe("2026-11-19");
		fireEvent.click(screen.getByLabelText("Due Today"));
		fireEvent.click(screen.getByLabelText("Due Next week"));
		expect(app.container.store.get().tasks[0]!.dueDay).toBe("2026-11-23");
		fireEvent.click(screen.getByLabelText("Due Mon, Nov 23"));
		const custom = screen.getByLabelText("Custom due date");
		fireEvent.change(custom, { target: { value: "2026-02-30" } });
		expect(screen.getByLabelText("Set custom due date").getAttribute("aria-disabled")).toBe("true");
		fireEvent.change(custom, { target: { value: "2026-12-24" } });
		fireEvent.click(screen.getByLabelText("Set custom due date"));
		expect(app.container.store.get().tasks[0]!.dueDay).toBe("2026-12-24");
		fireEvent.click(screen.getByLabelText("Due Thu, Dec 24"));
		fireEvent.click(screen.getByLabelText("Remove due date"));
		expect(app.container.store.get().tasks[0]!.dueDay).toBeNull();
	});

	it("flags overdue tasks and shows planned tasks by due date", async () => {
		const app = await start();
		addTask("Old");
		addTask("Soon");
		const [soon, old] = app.container.store
			.get()
			.tasks.map((task) => task.id)
			.reverse() as [string, string];
		app.container.store.setDueDay(old, "2026-11-10");
		app.container.store.setDueDay(soon, "2026-11-20");
		fireEvent.click(screen.getByLabelText("Planned"));
		const rows = screen.getAllByLabelText(/^Open /);
		expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual(["Open Old", "Open Soon"]);
		expect(screen.getByText(/Tasks · My Day · Tue, Nov 10/)).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Open Old"));
		expect(screen.getByLabelText("Due Tue, Nov 10")).toBeTruthy();
	});

	it("deletes a task from the details footer, which also shows when it was created", async () => {
		const app = await start();
		addTask("Short lived");
		fireEvent.click(screen.getByLabelText("Open Short lived"));
		expect(screen.getByText("Created a few moments ago")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Delete task"));
		expect(app.container.store.get().tasks).toEqual([]);
		expect(screen.queryByLabelText("Task details")).toBeNull();
	});

	it("shows the rows of the Microsoft To Do details pane in order", async () => {
		await start();
		fireEvent.click(screen.getByLabelText("Tasks"));
		addTask("Layout check");
		fireEvent.click(screen.getByLabelText("Open Layout check"));
		const details = within(screen.getByLabelText("Task details"));
		const labels = [
			"Add step",
			"Add to My Day",
			"Remind me",
			"Add due date",
			"Repeat",
			"Pick a category",
			"Add file",
			"Note",
			"Close details",
			"Delete task",
		];
		const positions = labels.map((label) => {
			const element = details.getAllByLabelText(label)[0]!;
			return Array.from(document.querySelectorAll("*")).indexOf(element);
		});
		expect(positions).toEqual([...positions].sort((a, b) => a - b));
		for (const label of ["Remind me", "Repeat", "Pick a category", "Add file"]) {
			expect(details.getByLabelText(label).getAttribute("aria-disabled")).toBe("true");
		}
	});

	it("adds, completes, renames and deletes steps", async () => {
		const app = await start();
		addTask("Big project");
		fireEvent.click(screen.getByLabelText("Open Big project"));
		fireEvent.click(screen.getByLabelText("Add step"));
		const field = screen.getByLabelText("New step");
		expect(document.activeElement).toBe(field);
		fireEvent.change(field, { target: { value: "First step" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect((screen.getByLabelText("New step") as HTMLInputElement).value).toBe("");
		fireEvent.change(screen.getByLabelText("New step"), { target: { value: "Second step" } });
		fireEvent.keyDown(screen.getByLabelText("New step"), { key: "Enter" });
		expect(app.container.store.get().tasks[0]!.steps.map((step) => step.title)).toEqual([
			"First step",
			"Second step",
		]);
		fireEvent.keyDown(screen.getByLabelText("New step"), { key: "Escape" });
		expect(screen.getByLabelText("Add step")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Mark step First step as completed"));
		expect(app.container.store.get().tasks[0]!.stepsCompleted).toBe(1);
		fireEvent.click(screen.getByLabelText("Mark step First step as not completed"));
		expect(app.container.store.get().tasks[0]!.stepsCompleted).toBe(0);
		const second = screen.getByLabelText("Step Second step");
		fireEvent.change(second, { target: { value: "Second, renamed" } });
		fireEvent.blur(second);
		expect(app.container.store.get().tasks[0]!.steps[1]!.title).toBe("Second, renamed");
		fireEvent.click(screen.getByLabelText("Delete step First step"));
		expect(app.container.store.get().tasks[0]!.steps).toHaveLength(1);
		fireEvent.click(screen.getByLabelText("Close details"));
		expect(screen.getByText(/0 of 1/)).toBeTruthy();
	});

	it("keeps a step that was typed when the field loses focus, and ignores an empty one", async () => {
		const app = await start();
		addTask("Blur steps");
		fireEvent.click(screen.getByLabelText("Open Blur steps"));
		fireEvent.click(screen.getByLabelText("Add step"));
		fireEvent.change(screen.getByLabelText("New step"), { target: { value: "Kept on blur" } });
		fireEvent.blur(screen.getByLabelText("New step"));
		expect(app.container.store.get().tasks[0]!.steps).toHaveLength(1);
		fireEvent.click(screen.getByLabelText("Add step"));
		fireEvent.blur(screen.getByLabelText("New step"));
		expect(app.container.store.get().tasks[0]!.steps).toHaveLength(1);
		fireEvent.click(screen.getByLabelText("Add step"));
		fireEvent.keyDown(screen.getByLabelText("New step"), { key: "a" });
		expect(screen.getByLabelText("New step")).toBeTruthy();
	});

	it("restores a step's title when it is emptied and leaves it alone when unchanged", async () => {
		const app = await start();
		addTask("Step edits");
		fireEvent.click(screen.getByLabelText("Open Step edits"));
		app.container.store.addStep(app.container.store.get().tasks[0]!.id, "Keep me");
		const step = await screen.findByLabelText("Step Keep me");
		fireEvent.change(step, { target: { value: "   " } });
		fireEvent.blur(step);
		expect((screen.getByLabelText("Step Keep me") as HTMLInputElement).value).toBe("Keep me");
		fireEvent.blur(step);
		expect(app.container.store.get().tasks[0]!.steps[0]!.title).toBe("Keep me");
	});

	it("saves the note when the field loses focus and not when nothing changed", async () => {
		const app = await start();
		addTask("Note taker");
		fireEvent.click(screen.getByLabelText("Open Note taker"));
		const note = screen.getByLabelText("Note");
		fireEvent.blur(note);
		expect(app.container.store.get().pendingChanges).toBe(1);
		fireEvent.change(note, { target: { value: "Remember this" } });
		fireEvent.blur(note);
		expect(app.container.store.get().tasks[0]!.note).toBe("Remember this");
		fireEvent.click(screen.getByLabelText("Close details"));
		fireEvent.click(screen.getByLabelText("Open Note taker"));
		expect((screen.getByLabelText("Note") as HTMLTextAreaElement).value).toBe("Remember this");
	});

	it("focuses the new list field as soon as it appears so the user can type straight away", async () => {
		await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const field = screen.getByLabelText("New list");
		expect(document.activeElement).toBe(field);
		expect(screen.queryByLabelText("Create a new list")).toBeNull();
	});

	it("cancels the new list field with Escape or by leaving it empty", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		fireEvent.keyDown(screen.getByLabelText("New list"), { key: "Escape" });
		expect(screen.getByLabelText("Create a new list")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		fireEvent.keyDown(screen.getByLabelText("New list"), { key: "a" });
		fireEvent.blur(screen.getByLabelText("New list"));
		expect(screen.getByLabelText("Create a new list")).toBeTruthy();
		expect(app.container.store.get().lists).toEqual([]);
	});

	it("creates the list once even when submitting also blurs the field", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const field = screen.getByLabelText("New list");
		fireEvent.change(field, { target: { value: "Once" } });
		fireEvent.keyDown(field, { key: "Enter" });
		fireEvent.blur(field);
		expect(app.container.store.get().lists).toHaveLength(1);
	});

	it("keeps what was typed when the field loses focus", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const field = screen.getByLabelText("New list");
		fireEvent.change(field, { target: { value: "Kept" } });
		fireEvent.blur(field);
		expect(app.container.store.get().lists.map((list) => list.name)).toEqual(["Kept"]);
		expect(screen.getByLabelText("Create a new list")).toBeTruthy();
	});

	it("creates, renames and deletes lists", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Groceries" } });
		fireEvent.keyDown(name, { key: "Enter" });
		expect(screen.getByRole("heading", { name: "Groceries" })).toBeTruthy();
		addTask("Eggs");
		expect(screen.queryByText(/Groceries ·/)).toBeNull();
		fireEvent.click(screen.getByLabelText("Rename list"));
		const rename = screen.getByLabelText("List name");
		fireEvent.change(rename, { target: { value: "Shopping" } });
		fireEvent.blur(rename);
		expect(screen.getByRole("heading", { name: "Shopping" })).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Rename list"));
		fireEvent.change(screen.getByLabelText("List name"), { target: { value: "Errands" } });
		fireEvent.keyDown(screen.getByLabelText("List name"), { key: "Enter" });
		expect(screen.getByRole("heading", { name: "Errands" })).toBeTruthy();
		fireEvent.contextMenu(screen.getByLabelText("Errands"));
		fireEvent.click(screen.getByLabelText("Delete List"));
		expect(app.container.store.get().lists).toEqual([]);
		expect(screen.getByRole("heading", { name: "My Day" })).toBeTruthy();
	});

	it("renames and prints from the sidebar right-click menu, and only for custom lists", async () => {
		const app = await start();
		fireEvent.contextMenu(screen.getByLabelText("My Day"));
		expect(screen.queryByRole("menu")).toBeNull();
		expect(screen.queryByLabelText("Rename list")).toBeNull();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Garden" } });
		fireEvent.keyDown(name, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("My Day"));
		fireEvent.contextMenu(screen.getByLabelText("Garden"));
		expect(screen.getByRole("menu", { name: "List actions" })).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Print List"));
		await waitFor(() => expect(app.printer.documents).toHaveLength(1));
		expect(screen.getByRole("heading", { name: "Garden" })).toBeTruthy();
		fireEvent.contextMenu(screen.getByLabelText("Garden"));
		fireEvent.click(screen.getByLabelText("Rename List"));
		const field = screen.getByLabelText("List name");
		fireEvent.change(field, { target: { value: "Yard" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(screen.getByRole("heading", { name: "Yard" })).toBeTruthy();
		expect(screen.queryByLabelText("List name")).toBeNull();
		app.container.store.startRenaming("my-day");
		expect(screen.queryByLabelText("List name")).toBeNull();
	});

	it("does not rename on a built-in list or a narrow screen when the title is clicked", async () => {
		await start();
		fireEvent.click(screen.getByRole("heading", { name: "My Day" }));
		expect(screen.queryByLabelText("List name")).toBeNull();
	});

	it("offers rename and delete in the kebab menu on narrow screens", async () => {
		const app = await start({ width: 400 });
		act(() => {
			app.container.store.addList("Pets");
		});
		expect(screen.queryByLabelText("Rename list")).toBeNull();
		fireEvent.click(screen.getByRole("heading", { name: "Pets" }));
		expect(screen.queryByLabelText("List name")).toBeNull();
		fireEvent.click(screen.getByLabelText("List options"));
		fireEvent.click(screen.getByLabelText("Rename List"));
		const field = screen.getByLabelText("List name");
		fireEvent.change(field, { target: { value: "Cats" } });
		fireEvent.blur(field);
		expect(screen.getByRole("heading", { name: "Cats" })).toBeTruthy();
		fireEvent.click(screen.getByLabelText("List options"));
		fireEvent.click(screen.getByLabelText("Delete List"));
		expect(app.container.store.get().lists).toEqual([]);
	});

	it("shows list names on tasks in smart views and open counts in the sidebar", async () => {
		await start();
		addTask("Counted");
		expect(screen.getAllByLabelText("1 open")).toHaveLength(3);
		fireEvent.click(screen.getByLabelText("All tasks"));
		expect(screen.getByText("Tasks · My Day")).toBeTruthy();
	});

	it("adds tasks to My Day, and lets them be added or removed from the details", async () => {
		const app = await start();
		addTask("Sunny task");
		fireEvent.click(screen.getByLabelText("Tasks"));
		addTask("Not in My Day");
		expect(screen.getByText("Not in My Day")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("My Day"));
		expect(screen.getByText("Sunny task")).toBeTruthy();
		expect(screen.queryByText("Not in My Day")).toBeNull();
		fireEvent.click(screen.getByLabelText("Tasks"));
		fireEvent.click(screen.getByLabelText("Open Not in My Day"));
		fireEvent.click(screen.getByLabelText("Add to My Day"));
		expect(screen.getByLabelText("Added to My Day")).toBeTruthy();
		expect(app.container.store.get().tasks.every((task) => task.isInMyDay("2026-11-19"))).toBe(
			true,
		);
		fireEvent.click(screen.getByLabelText("Added to My Day"));
		expect(screen.getByLabelText("Add to My Day")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("My Day"));
		expect(screen.queryByText("Not in My Day")).toBeNull();
	});

	it("shows tasks due today in My Day and lets the user take them out", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Tasks"));
		addTask("Pay the invoice");
		fireEvent.click(screen.getByLabelText("My Day"));
		expect(screen.queryByText("Pay the invoice")).toBeNull();
		fireEvent.click(screen.getByLabelText("Tasks"));
		fireEvent.click(screen.getByLabelText("Open Pay the invoice"));
		fireEvent.click(screen.getByLabelText("Add due date"));
		fireEvent.click(screen.getByLabelText("Due Today"));
		expect(screen.getByLabelText("Added to My Day")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Close details"));
		fireEvent.click(screen.getByLabelText("My Day"));
		expect(screen.getByText("Pay the invoice")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Open Pay the invoice"));
		fireEvent.click(screen.getByLabelText("Added to My Day"));
		expect(screen.getByLabelText("Add to My Day")).toBeTruthy();
		expect(app.container.store.get().tasks[0]!.data.myDayDismissed).toBe("2026-11-19");
		fireEvent.click(screen.getByLabelText("Close details"));
		expect(screen.queryByText("Pay the invoice")).toBeNull();
	});

	it("signs out from the sidebar", async () => {
		const app = await start();
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Sign out"));
		});
		expect(app.container.auth.get()).toBe("signedOut");
		expect(screen.getByLabelText("Sign in")).toBeTruthy();
	});

	it("renders in dark mode", async () => {
		await start({ scheme: "dark" });
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
	});

	it("renders the medium layout", async () => {
		await start({ width: 900 });
		fireEvent.click(screen.getByLabelText("Important"));
		expect(screen.getByRole("heading", { name: "Important" })).toBeTruthy();
		addTask("Medium");
		fireEvent.click(screen.getByLabelText("Open Medium"));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
		expect(screen.queryByLabelText("Show lists")).toBeNull();
	});
});

describe("compact layout", () => {
	it("navigates between lists, tasks and details", async () => {
		await start({ width: 400 });
		expect(screen.queryByLabelText("Lists")).toBeNull();
		addTask("Phone task");
		fireEvent.click(screen.getByLabelText("Show lists"));
		expect(screen.getByLabelText("Lists")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Important"));
		expect(screen.getByRole("heading", { name: "Important" })).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Show lists"));
		fireEvent.click(screen.getByLabelText("Tasks"));
		fireEvent.click(screen.getByLabelText("Open Phone task"));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Close details"));
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
	});

	it("returns to the task list after creating a list from the sidebar", async () => {
		await start({ width: 400 });
		fireEvent.click(screen.getByLabelText("Show lists"));
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Mobile list" } });
		fireEvent.keyDown(name, { key: "Enter" });
		expect(screen.getByRole("heading", { name: "Mobile list" })).toBeTruthy();
	});
});

describe("connectivity and sync", () => {
	it("shows a red sync-off icon only while offline with changes waiting, and queues them for later", async () => {
		const app = await start();
		const indicator = "Changes are waiting to sync";
		await act(async () => {
			app.connectivity.setOnline(false);
		});
		expect(screen.queryByLabelText(indicator)).toBeNull();
		addTask("Offline one");
		expect(screen.getByLabelText(indicator)).toBeTruthy();
		addTask("Offline two");
		expect(screen.getAllByLabelText(indicator)).toHaveLength(1);
		expect(screen.queryByText(/you're offline/i)).toBeNull();
		await act(async () => {
			app.connectivity.setOnline(true);
		});
		await waitFor(() => expect(app.container.store.get().pendingChanges).toBe(0));
		expect(screen.queryByLabelText(indicator)).toBeNull();
		const created = app.requests.filter((request) => request.method === "POST");
		expect(created.map((request) => (request.body as { title: string }).title).sort()).toEqual([
			"Offline one",
			"Offline two",
		]);
	});

	it("tells the user when the server refuses changes", async () => {
		const app = await start({
			respond: (method) =>
				method === "POST"
					? new Response(JSON.stringify({ error: "invalid" }), { status: 400 })
					: new Response(JSON.stringify({ tasks: [], lists: [], settings: [] }), { status: 200 }),
		});
		await waitFor(() => expect(app.container.sync.get().phase).toBe("idle"));
		addTask("Rejected one");
		await waitFor(() =>
			expect(screen.getByText("1 change couldn't be saved and was undone.")).toBeTruthy(),
		);
		expect(app.container.store.get().tasks).toEqual([]);
		addTask("Rejected two");
		addTask("Rejected three");
		await waitFor(() =>
			expect(screen.getByText("3 changes couldn't be saved and were undone.")).toBeTruthy(),
		);
		fireEvent.click(screen.getByLabelText("Dismiss"));
		expect(screen.queryByLabelText("Dismiss")).toBeNull();
	});

	it("asks the user to sign in again when the session expires, then clears the banner once signed in", async () => {
		let accepted = false;
		const app = await start({
			respond: () =>
				accepted
					? new Response(JSON.stringify({ tasks: [], lists: [], settings: [] }), { status: 200 })
					: new Response(JSON.stringify({ error: "expired" }), { status: 401 }),
		});
		await waitFor(() => expect(screen.getByText(/Your session has expired/)).toBeTruthy());
		accepted = true;
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Sign in again"));
		});
		expect(app.authorizationServer.authorizeCalls.length).toBeGreaterThanOrEqual(2);
		await waitFor(() => expect(screen.queryByText(/Your session has expired/)).toBeNull());
		expect(app.container.sync.get().phase).toBe("idle");
	});

	it("never shows a syncing message, even while a change is being sent", async () => {
		let release: (() => void) | undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const app = await start({
			respond: async (method) => {
				if (method === "POST") {
					await gate;
				}
				return new Response(JSON.stringify({ tasks: [], lists: [], settings: [] }), {
					status: 200,
				});
			},
		});
		await waitFor(() => expect(app.container.sync.get().phase).toBe("idle"));
		addTask("Slow");
		await waitFor(() => expect(app.container.sync.get().phase).toBe("syncing"), { timeout: 3000 });
		expect(screen.queryByText(/syncing/i)).toBeNull();
		expect(screen.queryByLabelText("Changes are waiting to sync")).toBeNull();
		release?.();
		await waitFor(() => expect(app.container.sync.get().phase).toBe("idle"));
	});
});

describe("list options menu", () => {
	const open = (label = "List options") => fireEvent.click(screen.getByLabelText(label));

	it("shows the horizontal button on wide screens and the vertical one on narrow screens", async () => {
		await start();
		const wide = screen.getByLabelText("List options").querySelector("path")!.getAttribute("d");
		expect(wide).toContain("M4.5 12");
		cleanup();
		await start({ width: 400 });
		const narrow = screen.getByLabelText("List options").querySelector("path")!.getAttribute("d");
		expect(narrow).toContain("M10.5 5");
	});

	it("dismisses the menu and the theme panel when the user switches lists", async () => {
		await start();
		open();
		fireEvent.click(screen.getByLabelText("Sort"));
		expect(screen.getByRole("menu", { name: "Sort" })).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Important", { selector: "[role=button]" }));
		expect(screen.queryByRole("menu")).toBeNull();
		expect(screen.getByRole("heading", { name: "Important" })).toBeTruthy();
		open();
		fireEvent.click(screen.getByLabelText("Change Theme…"));
		expect(screen.getByLabelText("Upload photo")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Planned", { selector: "[role=button]" }));
		expect(screen.queryByLabelText("Upload photo")).toBeNull();
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("keeps the menu open while the user stays on the same list", async () => {
		await start();
		open();
		addTask("Typed behind the menu");
		expect(screen.getByRole("menu", { name: "List options" })).toBeTruthy();
	});

	it("offers the list options and closes when the user clicks away", async () => {
		await start();
		open();
		for (const label of ["Sort", "Change Theme…", "Print List", "Hide Completed Tasks"]) {
			expect(screen.getByLabelText(label)).toBeTruthy();
		}
		expect(screen.queryByLabelText("Duplicate List")).toBeNull();
		fireEvent.click(screen.getByLabelText("Close menu"));
		expect(screen.queryByLabelText("List options", { selector: "[role=menu]" })).toBeNull();
		open();
		fireEvent.click(screen.getByLabelText("List options", { selector: "button" }));
		expect(screen.queryByRole("menu")).toBeNull();
	});

	it("sorts the list from the flyout and clears the sort when chosen again", async () => {
		const app = await start();
		addTask("Banana");
		app.clock.advance(1000);
		addTask("apple");
		app.clock.advance(1000);
		addTask("Cherry");
		const titles = () => app.container.store.visibleTasks().open.map((task) => task.title);
		expect(titles()).toEqual(["Cherry", "apple", "Banana"]);
		open();
		fireEvent.click(screen.getByLabelText("Sort"));
		for (const label of [
			"Importance",
			"Alphabetically",
			"Due Date",
			"Creation Date",
			"Added to My Day",
		]) {
			expect(screen.getByLabelText(label)).toBeTruthy();
		}
		fireEvent.click(screen.getByLabelText("Alphabetically"));
		expect(titles()).toEqual(["apple", "Banana", "Cherry"]);
		expect(screen.queryByRole("menu")).toBeNull();
		open();
		fireEvent.click(screen.getByLabelText("Sort"));
		expect(
			screen
				.getByLabelText("Alphabetically", { selector: "[role=menuitemradio]" })
				.getAttribute("aria-checked"),
		).toBe("true");
		fireEvent.click(screen.getByLabelText("Alphabetically"));
		expect(titles()).toEqual(["Cherry", "apple", "Banana"]);
		expect(app.container.store.settingsFor("my-day").sort).toBeNull();
	});

	it("drills into the sort options on narrow screens and can go back", async () => {
		const app = await start({ width: 400 });
		addTask("Zed");
		app.clock.advance(1000);
		addTask("Alpha");
		open();
		fireEvent.click(screen.getByLabelText("Sort"));
		expect(screen.queryByLabelText("Change Theme…")).toBeNull();
		fireEvent.click(screen.getByLabelText("Back"));
		expect(screen.getByLabelText("Change Theme…")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Sort"));
		fireEvent.click(screen.getByLabelText("Alphabetically"));
		expect(app.container.store.visibleTasks().open.map((task) => task.title)).toEqual([
			"Alpha",
			"Zed",
		]);
	});

	it("hides and shows completed tasks", async () => {
		const app = await start();
		addTask("Finished");
		fireEvent.click(screen.getByLabelText("Mark as completed"));
		expect(screen.getByText("Completed 1")).toBeTruthy();
		open();
		fireEvent.click(screen.getByLabelText("Hide Completed Tasks"));
		expect(screen.queryByText("Completed 1")).toBeNull();
		expect(app.container.store.settingsFor("my-day").hideCompleted).toBe(true);
		open();
		fireEvent.click(screen.getByLabelText("Show Completed Tasks"));
		expect(screen.getByText("Completed 1")).toBeTruthy();
	});

	it("duplicates a custom list and keeps the option out of built-in views", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Groceries" } });
		fireEvent.keyDown(name, { key: "Enter" });
		addTask("Milk");
		open();
		fireEvent.click(screen.getByLabelText("Duplicate List"));
		expect(screen.getByRole("heading", { name: "Copy of Groceries" })).toBeTruthy();
		expect(screen.getByText("Milk")).toBeTruthy();
		expect(app.container.store.get().lists.map((list) => list.name)).toEqual([
			"Groceries",
			"Copy of Groceries",
		]);
	});

	it("prints a custom list without a date line", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Groceries" } });
		fireEvent.keyDown(name, { key: "Enter" });
		addTask("Eggs");
		open();
		fireEvent.click(screen.getByLabelText("Print List"));
		await waitFor(() => expect(app.printer.documents).toHaveLength(1));
		expect(app.printer.documents[0]).toContain("<h1>Groceries</h1>");
		expect(app.printer.documents[0]).not.toContain('class="subtitle"');
	});

	it("prints the visible tasks, and survives a printer failure", async () => {
		const app = await start();
		addTask("Print me");
		open();
		fireEvent.click(screen.getByLabelText("Print List"));
		await waitFor(() => expect(app.printer.documents).toHaveLength(1));
		expect(app.printer.documents[0]).toContain("Print me");
		expect(app.printer.documents[0]).toContain("My Day");
		app.printer.failure = new Error("no printer");
		open();
		fireEvent.click(screen.getByLabelText("Print List"));
		await waitFor(() => expect(app.printer.documents).toHaveLength(2));
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
	});
});

describe("change theme", () => {
	const openTheme = () => {
		fireEvent.click(screen.getByLabelText("List options"));
		fireEvent.click(screen.getByLabelText("Change Theme…"));
	};

	it("lets the user pick a color for the current list and go back to the default", async () => {
		const app = await start();
		openTheme();
		expect(screen.getByLabelText("Red theme")).toBeTruthy();
		expect(screen.getByLabelText("Blue theme").getAttribute("aria-checked")).toBe("true");
		fireEvent.click(screen.getByLabelText("Red theme"));
		expect(app.container.store.settingsFor("my-day").theme).toEqual({
			type: "color",
			color: "#c0392b",
		});
		expect(screen.getByLabelText("Red theme").getAttribute("aria-checked")).toBe("true");
		fireEvent.click(screen.getByLabelText("Blue theme"));
		expect(app.container.store.settingsFor("my-day").theme).toBeNull();
		fireEvent.click(screen.getByLabelText("Close theme"));
		expect(screen.queryByLabelText("Upload photo")).toBeNull();
	});

	it("shows a list's default color as selected and uses it when nothing is chosen", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Tasks"));
		openTheme();
		expect(screen.getByLabelText("Periwinkle theme").getAttribute("aria-checked")).toBe("true");
		expect(screen.getByLabelText("Blue theme").getAttribute("aria-checked")).toBe("false");
		fireEvent.click(screen.getByLabelText("Peach theme"));
		expect(app.container.store.settingsFor("tasks").theme).toEqual({
			type: "color",
			color: "#f9e7de",
		});
		fireEvent.click(screen.getByLabelText("Periwinkle theme"));
		expect(app.container.store.settingsFor("tasks").theme).toBeNull();
		fireEvent.click(screen.getByLabelText("Close menu"));
		fireEvent.click(screen.getByLabelText("All tasks"));
		openTheme();
		expect(screen.getByLabelText("Peach theme").getAttribute("aria-checked")).toBe("true");
		fireEvent.click(screen.getByLabelText("Close menu"));
		fireEvent.click(screen.getByLabelText("Planned"));
		openTheme();
		expect(screen.getByLabelText("Mint theme").getAttribute("aria-checked")).toBe("true");
	});

	it("keeps each list's theme separate", async () => {
		const app = await start();
		openTheme();
		fireEvent.click(screen.getByLabelText("Green theme"));
		fireEvent.click(screen.getByLabelText("Close menu"));
		fireEvent.click(screen.getByLabelText("Important"));
		expect(app.container.store.settingsFor("important").theme).toBeNull();
		expect(app.container.store.settingsFor("my-day").theme).toEqual({
			type: "color",
			color: "#3a8a4a",
		});
	});

	it("uploads a photo, adds it to the theme menu, uses it as the background and can delete it permanently", async () => {
		const app = await start();
		openTheme();
		await waitFor(() => expect(app.photoGateway.calls).toContain("list"));
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Upload photo"));
		});
		const use = await screen.findByLabelText("Use photo beach.png");
		expect(app.photoGateway.photos).toHaveLength(1);
		fireEvent.click(use);
		expect(app.container.store.settingsFor("my-day").theme).toEqual({
			type: "photo",
			photoId: "photo-1",
		});
		expect(screen.getByLabelText("List background photo")).toBeTruthy();
		expect(screen.getByLabelText("Use photo beach.png").getAttribute("aria-checked")).toBe("true");
		fireEvent.click(screen.getByLabelText("Delete photo beach.png"));
		expect(screen.getByText(/Delete beach.png permanently/)).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Cancel delete photo"));
		expect(screen.queryByText(/permanently/)).toBeNull();
		expect(app.photoGateway.photos).toHaveLength(1);
		fireEvent.click(screen.getByLabelText("Delete photo beach.png"));
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Confirm delete photo"));
		});
		await waitFor(() => expect(screen.queryByLabelText("Use photo beach.png")).toBeNull());
		expect(app.photoGateway.photos).toEqual([]);
	});

	it("falls back to the default look when the chosen photo is not available", async () => {
		const app = await start();
		app.container.store.updateSettings("my-day", { theme: { type: "photo", photoId: "gone" } });
		expect(screen.queryByLabelText("List background photo")).toBeNull();
	});

	it("explains problems with a photo", async () => {
		const app = await start();
		openTheme();
		app.photoPicker.next = {
			name: "movie.gif",
			contentType: "image/gif",
			size: 10,
			body: new Blob(["x"]),
		};
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Upload photo"));
		});
		expect(await screen.findByText("Choose a JPEG, PNG or WebP image.")).toBeTruthy();
		app.photoGateway.failure = new Error("offline");
		app.photoPicker.next = {
			name: "ok.png",
			contentType: "image/png",
			size: 10,
			body: new Blob(["x"]),
		};
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Upload photo"));
		});
		expect(await screen.findByText(/Photos are unavailable/)).toBeTruthy();
	});

	it("shows the upload progress and cannot be started twice", async () => {
		const app = await start();
		openTheme();
		let release: (() => void) | undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const create = app.photoGateway.create.bind(app.photoGateway);
		app.photoGateway.create = async (picked) => {
			await gate;
			return create(picked);
		};
		await act(async () => {
			fireEvent.click(screen.getByLabelText("Upload photo"));
		});
		expect(screen.getByText("Uploading…")).toBeTruthy();
		release?.();
		await screen.findByLabelText("Use photo beach.png");
		expect(screen.getByText("Upload")).toBeTruthy();
	});

	it("themes the list on narrow screens too", async () => {
		const app = await start({ width: 400 });
		fireEvent.click(screen.getByLabelText("List options"));
		fireEvent.click(screen.getByLabelText("Change Theme…"));
		fireEvent.click(screen.getByLabelText("Purple theme"));
		expect(app.container.store.settingsFor("my-day").theme).toEqual({
			type: "color",
			color: "#6b5bb5",
		});
		fireEvent.click(screen.getByLabelText("Close theme"));
		addTask("Themed");
		fireEvent.click(screen.getByLabelText("Open Themed"));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
	});
});

describe("selecting several tasks", () => {
	async function withTasks(titles: string[]) {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Tasks"));
		for (const title of titles) {
			app.clock.advance(1000);
			addTask(title);
		}
		return app;
	}

	const row = (title: string) => screen.getByLabelText(`Open ${title}`);
	const selectedTitles = (app: Awaited<ReturnType<typeof withTasks>>) =>
		app.container.store.selectedTasks.map((task) => task.title).sort();

	it("opens one task with a plain click and clears the detail pane for several", async () => {
		const app = await withTasks(["A", "B", "C", "D"]);
		fireEvent.click(row("B"));
		expect(screen.getByLabelText("Task details")).toBeTruthy();
		fireEvent.click(row("D"), { ctrlKey: true });
		expect(selectedTitles(app)).toEqual(["B", "D"]);
		expect(screen.queryByLabelText("Task details")).toBeNull();
		fireEvent.click(row("A"), { metaKey: true });
		expect(selectedTitles(app)).toEqual(["A", "B", "D"]);
		fireEvent.click(row("B"), { ctrlKey: true });
		expect(selectedTitles(app)).toEqual(["A", "D"]);
		fireEvent.click(row("C"));
		expect(selectedTitles(app)).toEqual(["C"]);
		expect(screen.getByLabelText("Task details")).toBeTruthy();
	});

	it("selects a range with shift click, from the first click to the second", async () => {
		const app = await withTasks(["A", "B", "C", "D"]);
		fireEvent.click(row("D"));
		fireEvent.click(row("B"), { shiftKey: true });
		expect(selectedTitles(app)).toEqual(["B", "C", "D"]);
		fireEvent.click(row("A"), { shiftKey: true });
		expect(selectedTitles(app)).toEqual(["A", "B", "C", "D"]);
	});
});

describe("task context menu", () => {
	async function withTasks(titles: string[]) {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Tasks"));
		for (const title of titles) {
			app.clock.advance(1000);
			addTask(title);
		}
		return app;
	}

	const row = (title: string) => screen.getByLabelText(`Open ${title}`);
	const rightClick = (title: string) =>
		fireEvent.contextMenu(row(title), { clientX: 200, clientY: 150 });
	const item = (label: string) => screen.getByLabelText(label, { selector: "[role=menuitem]" });

	it("offers every action for a task", async () => {
		await withTasks(["Solo"]);
		rightClick("Solo");
		expect(screen.getByRole("menu", { name: "Task options" })).toBeTruthy();
		for (const label of [
			"Add to My Day",
			"Mark as Important",
			"Mark as Completed",
			"Due Today",
			"Due Tomorrow",
			"Pick a date",
			"Create New List from This Task",
			"Move Task to…",
			"Delete Task",
		]) {
			expect(item(label)).toBeTruthy();
		}
	});

	it("changes the task and reflects its state in the labels", async () => {
		const app = await withTasks(["Solo"]);
		const store = app.container.store;
		const task = () => store.get().tasks[0]!;
		rightClick("Solo");
		fireEvent.click(item("Add to My Day"));
		expect(task().isInMyDay(store.today)).toBe(true);
		expect(screen.queryByRole("menu")).toBeNull();
		rightClick("Solo");
		fireEvent.click(item("Mark as Important"));
		expect(task().important).toBe(true);
		rightClick("Solo");
		expect(item("Remove from My Day")).toBeTruthy();
		expect(item("Remove Importance")).toBeTruthy();
		fireEvent.click(item("Mark as Completed"));
		expect(task().completed).toBe(true);
		expect(app.sounds.plays).toBe(1);
		rightClick("Solo");
		fireEvent.click(item("Mark as Not Completed"));
		expect(task().completed).toBe(false);
		rightClick("Solo");
		fireEvent.click(item("Remove from My Day"));
		expect(task().isInMyDay(store.today)).toBe(false);
		rightClick("Solo");
		fireEvent.click(item("Remove Importance"));
		expect(task().important).toBe(false);
	});

	it("sets due dates from the shortcuts or the date picker", async () => {
		const app = await withTasks(["Solo"]);
		const due = () => app.container.store.get().tasks[0]!.dueDay;
		rightClick("Solo");
		fireEvent.click(item("Due Today"));
		expect(due()).toBe("2026-11-19");
		rightClick("Solo");
		fireEvent.click(item("Due Tomorrow"));
		expect(due()).toBe("2026-11-20");
		rightClick("Solo");
		fireEvent.click(item("Pick a date"));
		fireEvent.click(screen.getByLabelText("Due Next week"));
		expect(due()).toBe("2026-11-23");
		expect(screen.queryByRole("menu")).toBeNull();
		rightClick("Solo");
		fireEvent.click(item("Pick a date"));
		fireEvent.click(screen.getByLabelText("Remove due date"));
		expect(due()).toBeNull();
	});

	it("moves the task to another list through a submenu and can go back", async () => {
		const app = await withTasks(["Solo"]);
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Work" } });
		fireEvent.keyDown(name, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("Tasks"));
		rightClick("Solo");
		fireEvent.click(item("Move Task to…"));
		expect(item("Work")).toBeTruthy();
		expect(item("Tasks")).toBeTruthy();
		fireEvent.click(item("Back"));
		expect(item("Delete Task")).toBeTruthy();
		fireEvent.click(item("Move Task to…"));
		fireEvent.click(item("Work"));
		expect(app.container.store.get().tasks[0]!.listId).not.toBeNull();
		fireEvent.click(screen.getByLabelText("Work"));
		rightClick("Solo");
		fireEvent.click(item("Move Task to…"));
		fireEvent.click(item("Tasks"));
		expect(app.container.store.get().tasks[0]!.listId).toBeNull();
	});

	it("turns a task into a list and deletes tasks", async () => {
		const app = await withTasks(["Trip", "Spare"]);
		app.container.store.addStep(
			app.container.store.get().tasks.find((task) => task.title === "Trip")!.id,
			"Pack",
		);
		rightClick("Trip");
		fireEvent.click(item("Create New List from This Task"));
		expect(screen.getByRole("heading", { name: "Trip" })).toBeTruthy();
		expect(screen.getByText("Pack")).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Tasks"));
		expect(screen.queryByLabelText("Open Trip")).toBeNull();
		rightClick("Spare");
		fireEvent.click(item("Delete Task"));
		expect(screen.queryByText("Spare")).toBeNull();
	});

	it("applies to every selected task when right-clicking inside the selection", async () => {
		const app = await withTasks(["A", "B", "C"]);
		fireEvent.click(row("A"));
		fireEvent.click(row("C"), { ctrlKey: true });
		rightClick("A");
		expect(
			screen
				.getByLabelText("Create New List from This Task", { selector: "[role=menuitem]" })
				.getAttribute("aria-disabled"),
		).toBe("true");
		fireEvent.click(item("Mark as Completed"));
		expect(
			app.container.store
				.get()
				.tasks.filter((task) => task.completed)
				.map((task) => task.title)
				.sort(),
		).toEqual(["A", "C"]);
		rightClick("C");
		fireEvent.click(item("Delete Task"));
		expect(app.container.store.get().tasks.map((task) => task.title)).toEqual(["B"]);
	});

	it("sets one due date for tasks that had different ones", async () => {
		const app = await withTasks(["A", "B"]);
		const [a, b] = app.container.store.get().tasks;
		app.container.store.setDueDay(a!.id, "2026-11-21");
		app.container.store.setDueDay(b!.id, "2026-11-22");
		fireEvent.click(row("A"));
		fireEvent.click(row("B"), { ctrlKey: true });
		rightClick("A");
		fireEvent.click(item("Pick a date"));
		expect(screen.queryByLabelText("Remove due date")).toBeNull();
		fireEvent.click(screen.getByLabelText("Due Tomorrow"));
		expect(app.container.store.get().tasks.map((task) => task.dueDay)).toEqual([
			"2026-11-20",
			"2026-11-20",
		]);
	});

	it("only changes the clicked task when it is outside the selection", async () => {
		const app = await withTasks(["A", "B", "C"]);
		fireEvent.click(row("A"));
		fireEvent.click(row("B"), { ctrlKey: true });
		rightClick("C");
		fireEvent.click(item("Mark as Important"));
		expect(
			app.container.store
				.get()
				.tasks.filter((task) => task.important)
				.map((task) => task.title),
		).toEqual(["C"]);
	});

	it("closes without changing anything when the user clicks away", async () => {
		const app = await withTasks(["Solo"]);
		rightClick("Solo");
		fireEvent.click(screen.getByLabelText("Close menu"));
		expect(screen.queryByRole("menu")).toBeNull();
		expect(app.container.store.get().tasks[0]!.completed).toBe(false);
	});
});
