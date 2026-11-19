import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function start() {
	const app = await renderApp();
	stop = app.stop;
	act(() => {
		for (const name of ["Alpha", "Beta", "Gamma"]) {
			app.clock.advance(1000);
			app.container.store.addList(name);
		}
		app.container.store.select("my-day");
	});
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
const groupOf = (app: App, name: string) =>
	app.container.store.get().lists.find((list) => list.name === name)!.groupId;

describe("groups in the sidebar", () => {
	it("creates a group from a list, names it inline and shows its lists underneath", async () => {
		const app = await start();
		fireEvent.contextMenu(screen.getByLabelText("Beta"));
		fireEvent.click(menuItem("Create Group"));
		const field = screen.getByLabelText("Group name");
		expect((field as HTMLInputElement).value).toBe("New group");
		fireEvent.change(field, { target: { value: "Home" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(screen.queryByLabelText("Group name")).toBeNull();
		expect(app.container.store.get().groups.map((group) => group.name)).toEqual(["Home"]);
		expect(groupOf(app, "Beta")).not.toBeNull();
		const header = screen.getByLabelText("Group Home");
		expect(header.getAttribute("aria-expanded")).toBe("true");
		expect(screen.getByLabelText("Beta")).toBeTruthy();
		fireEvent.click(header);
		expect(header.getAttribute("aria-expanded")).toBe("false");
		expect(screen.queryByLabelText("Beta")).toBeNull();
		fireEvent.click(header);
		expect(screen.getByLabelText("Beta")).toBeTruthy();
		fireEvent.click(header);
		fireEvent.click(header);
	});

	it("moves lists into and out of groups from the list menu", async () => {
		const app = await start();
		mutate(app, (store) => {
			store.addGroup("Home");
			store.addGroup("Work");
		});
		const groups = app.container.store.get().groups;
		const open = (name: string) => {
			fireEvent.contextMenu(screen.getByLabelText(name));
			fireEvent.click(menuItem("Move to Group…"));
		};
		open("Alpha");
		expect(screen.queryByLabelText("Remove from Group")).toBeNull();
		fireEvent.click(menuItem("Home"));
		expect(groupOf(app, "Alpha")).toBe(groups[0]!.id);
		open("Alpha");
		expect(screen.queryByLabelText("Home", { selector: "[role=menuitem]" })).toBeNull();
		fireEvent.click(menuItem("Work"));
		expect(groupOf(app, "Alpha")).toBe(groups[1]!.id);
		open("Alpha");
		fireEvent.click(menuItem("Remove from Group"));
		expect(groupOf(app, "Alpha")).toBeNull();
	});

	it("renames and ungroups a group from its context menu, keeping its lists", async () => {
		const app = await start();
		mutate(app, (store) => {
			const group = store.addGroup("Home")!;
			store.setListGroup(store.get().lists[0]!.id, group);
		});
		fireEvent.contextMenu(screen.getByLabelText("Group Home"));
		expect(screen.getByRole("menu", { name: "Group actions" })).toBeTruthy();
		fireEvent.click(menuItem("Rename Group"));
		const field = screen.getByLabelText("Group name");
		fireEvent.change(field, { target: { value: "House" } });
		fireEvent.blur(field);
		expect(screen.getByLabelText("Group House")).toBeTruthy();
		fireEvent.contextMenu(screen.getByLabelText("Group House"));
		fireEvent.click(menuItem("Delete group"));
		expect(screen.queryByLabelText("Group House")).toBeNull();
		expect(screen.getByLabelText("Alpha")).toBeTruthy();
		expect(app.container.store.get().lists.every((list) => list.groupId === null)).toBe(true);
	});

	it("keeps the toggle idle while renaming and shows lists of an unknown group as ungrouped", async () => {
		const app = await start();
		const group = mutate(app, (store) => {
			const created = store.addGroup("Home")!;
			store.startRenamingGroup(created);
			return created;
		});
		fireEvent.click(screen.getByLabelText("Group Home"));
		expect(screen.getByLabelText("Group name")).toBeTruthy();
		mutate(app, (store) => {
			store.stopRenamingGroup();
			store.setListGroup(store.get().lists[0]!.id, group);
		});
		act(() => {
			void app.container.database.apply((snapshot) => ({
				...snapshot,
				groups: snapshot.groups.filter((entry) => entry.id !== group),
			}));
		});
		expect(screen.getByLabelText("Alpha")).toBeTruthy();
	});

	it("reorders lists only within their own group when dragging", async () => {
		const app = await start();
		const group = mutate(app, (store) => {
			const created = store.addGroup("Home")!;
			const [alpha, beta] = store.get().lists;
			store.setListGroup(alpha!.id, created);
			store.setListGroup(beta!.id, created);
			return created;
		});
		Array.from(document.querySelectorAll<HTMLElement>("[data-list-row]")).forEach((row, index) => {
			row.getBoundingClientRect = () =>
				({ top: index * 40, height: 40, bottom: index * 40 + 40 }) as DOMRect;
		});
		fireEvent.mouseDown(screen.getByLabelText("Beta"), { clientY: 60 });
		fireEvent.mouseMove(window, { clientY: 5 });
		fireEvent.mouseUp(window, { clientY: 5 });
		const order = app.container.store
			.orderedLists()
			.filter((list) => list.groupId === group)
			.map((list) => list.name);
		expect(order).toEqual(["Beta", "Alpha"]);
	});
});

describe("creating groups without a list", () => {
	it("creates and names a group from the small button next to New list", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Create group"));
		const field = screen.getByLabelText("Group name");
		fireEvent.change(field, { target: { value: "Errands" } });
		fireEvent.keyDown(field, { key: "Enter" });
		expect(app.container.store.get().groups.map((group) => group.name)).toEqual(["Errands"]);
		expect(screen.getByLabelText("Group Errands")).toBeTruthy();
		expect(app.container.store.newGroup("  ")).toBeNull();
	});

	it("offers Create Group when right-clicking empty space in the sidebar, but not on a list", async () => {
		const app = await start();
		fireEvent.contextMenu(screen.getByLabelText("Empty space in the lists"));
		expect(screen.getByRole("menu", { name: "Sidebar actions" })).toBeTruthy();
		fireEvent.click(menuItem("Create Group"));
		expect(screen.getByLabelText("Group name")).toBeTruthy();
		expect(app.container.store.get().groups).toHaveLength(1);
		fireEvent.keyDown(screen.getByLabelText("Group name"), { key: "Enter" });
		fireEvent.contextMenu(screen.getByLabelText("Alpha"));
		expect(screen.getByRole("menu", { name: "List actions" })).toBeTruthy();
		expect(screen.queryByRole("menu", { name: "Sidebar actions" })).toBeNull();
	});
});
