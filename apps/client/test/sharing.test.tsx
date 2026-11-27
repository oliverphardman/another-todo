import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ApiError } from "../src/api/errors";
import { HttpShareGateway } from "../src/shares/http-share-gateway";
import { ShareErrors } from "../src/shares/share-errors";
import { AuthorizedHttp } from "../src/api/authorized-http";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

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

const menuItem = (label: string) => screen.getByLabelText(label, { selector: "[role=menuitem]" });

function addSharedWithMe(app: App) {
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
}

describe("HttpShareGateway and ShareErrors", () => {
	it("lists, adds and removes members with encoded ids", async () => {
		const calls: { method: string; url: string; body: unknown }[] = [];
		const gateway = new HttpShareGateway(
			new AuthorizedHttp(
				"https://api.test",
				{ getAccessToken: async () => "t" },
				async (url, init) => {
					calls.push({ method: init?.method ?? "", url, body: init?.body });
					return init?.method === "DELETE"
						? new Response(null, { status: 204 })
						: init?.method === "POST"
							? new Response(JSON.stringify({ id: "m", email: "a@x.com", createdAt: "x" }), {
									status: 201,
								})
							: new Response(
									JSON.stringify({ shares: [{ id: "m", email: "a@x.com", createdAt: "x" }] }),
								);
				},
			),
		);
		expect(await gateway.list("l/1")).toEqual([{ id: "m", email: "a@x.com", createdAt: "x" }]);
		expect(await gateway.add("l/1", "a@x.com")).toEqual({
			id: "m",
			email: "a@x.com",
			createdAt: "x",
		});
		await gateway.remove("l/1", "m/2");
		expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
			"GET https://api.test/lists/l%2F1/shares",
			"POST https://api.test/lists/l%2F1/shares",
			"DELETE https://api.test/lists/l%2F1/shares/m%2F2",
		]);
		expect(calls[1]!.body).toBe(JSON.stringify({ email: "a@x.com" }));
	});

	it("maps failures to messages", () => {
		expect(ShareErrors.keyFor(new ApiError(404, "x"))).toBe("share.errorNotFound");
		expect(ShareErrors.keyFor(new ApiError(400, "x"))).toBe("share.errorInvalid");
		expect(ShareErrors.keyFor(new ApiError(500, "x"))).toBe("share.errorUnavailable");
		expect(ShareErrors.keyFor(new Error("offline"))).toBe("share.errorUnavailable");
	});
});

describe("sharing a list", () => {
	it("opens the share panel from the list menu, adds and removes people", async () => {
		const app = await start();
		app.shareGateway.members.set("mine", [{ id: "m-old", email: "old@x.com", createdAt: "x" }]);
		mutate(app, (store) => store.addList("Mine"));
		const id = app.container.store.get().lists[0]!.id;
		app.shareGateway.members.set(id, [{ id: "m-old", email: "old@x.com", createdAt: "x" }]);
		mutate(app, (store) => store.select("my-day"));
		fireEvent.contextMenu(screen.getByLabelText("Mine"));
		fireEvent.click(menuItem("Share List"));
		expect(await screen.findByText("old@x.com")).toBeTruthy();
		const field = screen.getByLabelText("Email address");
		fireEvent.change(field, { target: { value: "  " } });
		fireEvent.click(screen.getByLabelText("Share"));
		expect(app.shareGateway.calls.filter((call) => call.startsWith("add"))).toEqual([]);
		fireEvent.change(field, { target: { value: "new@x.com" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(await screen.findByText("new@x.com")).toBeTruthy();
		expect((field as HTMLInputElement).value).toBe("");
		fireEvent.change(field, { target: { value: "new@x.com" } });
		fireEvent.click(screen.getByLabelText("Share"));
		await waitFor(() => expect(screen.getAllByText("new@x.com")).toHaveLength(1));
		fireEvent.click(screen.getByLabelText("Remove old@x.com"));
		await waitFor(() => expect(screen.queryByText("old@x.com")).toBeNull());
		fireEvent.click(screen.getByLabelText("Close sharing"));
		expect(screen.queryByLabelText("Email address")).toBeNull();
	});

	it("explains why sharing failed", async () => {
		const app = await start();
		mutate(app, (store) => store.addList("Mine"));
		mutate(app, (store) => store.select("my-day"));
		fireEvent.contextMenu(screen.getByLabelText("Mine"));
		fireEvent.click(menuItem("Share List"));
		const field = await screen.findByLabelText("Email address");
		fireEvent.change(field, { target: { value: "x@x.com" } });
		for (const [status, text] of [
			[404, "No account was found for that email address"],
			[400, "That email address cannot be used"],
			[500, "Sharing needs a connection. Try again later."],
		] as const) {
			app.shareGateway.failure = new ApiError(status, "no");
			fireEvent.click(screen.getByLabelText("Share"));
			expect(await screen.findByText(text)).toBeTruthy();
		}
		app.shareGateway.failure = null;
		fireEvent.click(screen.getByLabelText("Share"));
		await waitFor(() =>
			expect(screen.queryByText("Sharing needs a connection. Try again later.")).toBeNull(),
		);
	});

	it("keeps Create Group and Share List out of the list options menu, in the requested order", async () => {
		const app = await start({ width: 400 });
		mutate(app, (store) => store.addList("Mine"));
		fireEvent.click(screen.getByLabelText("List options"));
		expect(screen.queryByLabelText("Share List")).toBeNull();
		expect(screen.queryByLabelText("Create Group")).toBeNull();
		const labels = Array.from(document.querySelectorAll("[role=menu] [role=menuitem]")).map(
			(item) => item.getAttribute("aria-label"),
		);
		expect(labels).toEqual([
			"Rename List",
			"Sort",
			"Change Theme…",
			"Duplicate List",
			"Print List",
			"Export List…",
			"Hide Completed Tasks",
			"Delete List",
		]);
		expect(document.querySelectorAll("[role=menu] [role=separator]").length).toBe(1);
	});
});

describe("lists shared with you", () => {
	it("only offers printing and leaving, and cannot be renamed, grouped or reordered", async () => {
		const app = await start();
		addSharedWithMe(app);
		mutate(app, (store) => store.select("theirs"));
		expect(screen.queryByLabelText("Rename list")).toBeNull();
		fireEvent.click(screen.getByRole("heading", { name: "Theirs" }));
		expect(screen.queryByLabelText("List name")).toBeNull();
		fireEvent.contextMenu(screen.getByLabelText("Theirs"));
		expect(menuItem("Print List")).toBeTruthy();
		expect(screen.queryByLabelText("Rename List", { selector: "[role=menuitem]" })).toBeNull();
		expect(screen.queryByLabelText("Share List", { selector: "[role=menuitem]" })).toBeNull();
		fireEvent.click(menuItem("Leave List"));
		expect(app.container.store.get().lists).toEqual([]);
	});

	it("offers Leave List in the options menu and hides owner-only entries", async () => {
		const app = await start();
		addSharedWithMe(app);
		mutate(app, (store) => store.select("theirs"));
		fireEvent.click(screen.getByLabelText("List options"));
		expect(screen.queryByLabelText("Share List")).toBeNull();
		expect(screen.queryByLabelText("Create Group")).toBeNull();
		expect(screen.queryByLabelText("Rename List")).toBeNull();
		fireEvent.click(screen.getByLabelText("Leave List"));
		expect(app.container.store.get().lists).toEqual([]);
	});

	it("keeps tasks in a shared list from moving between owners", async () => {
		const app = await start();
		addSharedWithMe(app);
		mutate(app, (store) => {
			store.select("theirs");
			store.addTask("Shared task");
			store.addList("Mine");
			store.select("theirs");
		});
		fireEvent.contextMenu(screen.getByLabelText("Open Shared task"));
		expect(screen.queryByLabelText("Move Task to…", { selector: "[role=menuitem]" })).toBeNull();
		expect(
			screen.queryByLabelText("Create New List from This Task", { selector: "[role=menuitem]" }),
		).toBeNull();
		expect(menuItem("Delete Task")).toBeTruthy();
		const store = app.container.store;
		const before = store
			.get()
			.lists.map((list) => [list.id, list.groupId, list.position, list.name]);
		mutate(app, (s) => {
			s.startRenaming("theirs");
			s.setListGroup("theirs", null);
			s.moveList("theirs", 0);
			s.renameList("theirs", "Nope");
		});
		expect(store.get().renamingViewId).toBeNull();
		expect(
			store.get().lists.map((list) => [list.id, list.groupId, list.position, list.name]),
		).toEqual(before);
	});

	it("targets only your own lists when moving a task", async () => {
		const app = await start();
		addSharedWithMe(app);
		mutate(app, (store) => {
			store.select("tasks");
			store.addTask("Mine");
			store.addList("Own");
			store.select("tasks");
		});
		fireEvent.contextMenu(screen.getByLabelText("Open Mine"));
		fireEvent.click(menuItem("Move Task to…"));
		expect(menuItem("Own")).toBeTruthy();
		expect(screen.queryByLabelText("Theirs", { selector: "[role=menuitem]" })).toBeNull();
	});
});
