import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
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
		for (const name of ["Important", "Planned", "All tasks", "Tasks"]) {
			expect(screen.getByLabelText(name)).toBeTruthy();
		}
		expect(screen.getByText("No tasks here yet")).toBeTruthy();
		expect(screen.getByRole("heading", { name: "Tasks" })).toBeTruthy();
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
		expect(screen.getByText(/Tasks · Tue, Nov 10/)).toBeTruthy();
		fireEvent.click(screen.getByLabelText("Open Old"));
		expect(screen.getByLabelText("Due Tue, Nov 10")).toBeTruthy();
	});

	it("moves a task between lists and deletes it", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Work" } });
		fireEvent.keyDown(name, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("Tasks"));
		addTask("Loose task");
		fireEvent.click(screen.getByLabelText("Open Loose task"));
		fireEvent.click(screen.getByLabelText("Move to Work"));
		expect(app.container.store.get().tasks[0]!.listId).not.toBeNull();
		fireEvent.click(screen.getByLabelText("Move to Tasks"));
		expect(app.container.store.get().tasks[0]!.listId).toBeNull();
		fireEvent.click(screen.getByLabelText("Delete task"));
		expect(app.container.store.get().tasks).toEqual([]);
	});

	it("creates, renames and deletes lists", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create a new list"));
		const name = screen.getByLabelText("New list");
		fireEvent.change(name, { target: { value: "Groceries" } });
		fireEvent.click(screen.getByLabelText("Add"));
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
		fireEvent.click(screen.getByLabelText("Delete list"));
		expect(app.container.store.get().lists).toEqual([]);
		expect(screen.getByRole("heading", { name: "Tasks" })).toBeTruthy();
	});

	it("shows list names on tasks in smart views and open counts in the sidebar", async () => {
		await start();
		addTask("Counted");
		expect(screen.getAllByLabelText("1 open")).toHaveLength(2);
		fireEvent.click(screen.getByLabelText("All tasks"));
		expect(screen.getAllByText("Tasks")).toHaveLength(2);
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
					: new Response(JSON.stringify({ tasks: [], lists: [] }), { status: 200 }),
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
					? new Response(JSON.stringify({ tasks: [], lists: [] }), { status: 200 })
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
				return new Response(JSON.stringify({ tasks: [], lists: [] }), { status: 200 });
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
