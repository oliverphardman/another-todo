import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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

const press = async (element: HTMLElement) => {
	await act(async () => {
		fireEvent.click(element);
	});
};

function addTask(app: App, title: string): string {
	let id = "";
	act(() => {
		id = app.container.store.addTask(title)!;
	});
	return id;
}

async function openSettings() {
	await press(screen.getByLabelText("Settings", { selector: "[role=button]" }));
	return within(screen.getByRole("dialog", { name: "Settings" }));
}

async function deleteListFromSidebar(name: string) {
	await act(async () => {
		fireEvent.contextMenu(screen.getByLabelText(name));
	});
	await press(screen.getByLabelText("Delete List"));
}

describe("the general settings", () => {
	it("are both ticked at first and can be unticked", async () => {
		const app = await start();
		const dialog = await openSettings();
		for (const label of ["Play completion sound", "Confirm before deleting"]) {
			const box = dialog.getByLabelText(label);
			expect(box.getAttribute("aria-checked")).toBe("true");
			await press(box);
			expect(box.getAttribute("aria-checked")).toBe("false");
		}
		expect(app.container.settings.get()).toMatchObject({
			completionSound: false,
			confirmDelete: false,
		});
	});

	it("start with what the server prefers", async () => {
		const app = await start({
			config: { defaultSettings: { completionSound: false, confirmDelete: false } },
		});
		expect(app.container.settings.get()).toMatchObject({
			completionSound: false,
			confirmDelete: false,
		});
	});
});

describe("playing the completion sound", () => {
	it("follows the setting for one task and for several", async () => {
		const app = await start();
		const { store, settings } = app.container;
		const first = addTask(app, "First");
		const second = addTask(app, "Second");
		act(() => settings.change({ completionSound: false }));
		act(() => store.toggleCompleted(first));
		act(() => store.completeTasks([second], true));
		expect(app.sounds.plays).toBe(0);
		act(() => settings.change({ completionSound: true }));
		act(() => store.completeTasks([first, second], false));
		act(() => store.toggleCompleted(first));
		act(() => store.completeTasks([second], true));
		expect(app.sounds.plays).toBe(2);
	});
});

describe("confirming before deleting", () => {
	it("keeps a list until the deletion is confirmed", async () => {
		const app = await start();
		act(() => void app.container.store.addList("Pets"));
		await deleteListFromSidebar("Pets");
		const alert = () => within(screen.getByRole("alert"));
		expect(alert().getByText("“Pets” will be permanently deleted.")).toBeTruthy();
		await press(alert().getByLabelText("Cancel"));
		expect(app.container.store.get().lists).toHaveLength(1);
		await deleteListFromSidebar("Pets");
		await press(alert().getByLabelText("Delete list"));
		expect(app.container.store.get().lists).toEqual([]);
	});

	it("ignores a list that is already gone", async () => {
		const app = await start();
		act(() => void app.container.store.addList("Pets"));
		await act(async () => {
			fireEvent.contextMenu(screen.getByLabelText("Pets"));
		});
		const remove = screen.getByLabelText("Delete List");
		const doomed = app.container.store.get().lists[0]!.id;
		const deleteList = vi.spyOn(app.container.store, "deleteList");
		act(() => {
			app.container.store.deleteList(doomed);
			fireEvent.click(remove);
		});
		await act(async () => undefined);
		expect(screen.queryByRole("alert")).toBeNull();
		expect(deleteList).toHaveBeenCalledTimes(1);
	});

	it("deletes lists, tasks and files at once when turned off", async () => {
		const app = await start();
		const { store, settings } = app.container;
		act(() => settings.change({ confirmDelete: false }));
		act(() => void store.addList("Pets"));
		await deleteListFromSidebar("Pets");
		expect(screen.queryByRole("alert")).toBeNull();
		expect(store.get().lists).toEqual([]);
		addTask(app, "Gone soon");
		await press(screen.getByLabelText("Open Gone soon"));
		await press(screen.getByLabelText("Delete task"));
		expect(screen.queryByRole("alert")).toBeNull();
		expect(store.get().tasks).toEqual([]);
	});

	it("removes files and uploaded photos at once when turned off", async () => {
		const app = await renderApp();
		stop = app.stop;
		act(() => app.container.settings.change({ confirmDelete: false }));
		addTask(app, "With file");
		await press(screen.getByLabelText("Open With file"));
		await press(screen.getByLabelText("Add file"));
		await press(await screen.findByLabelText("Remove report.pdf"));
		await waitFor(() => expect(app.attachmentGateway.attachments).toEqual([]));
		expect(screen.queryByRole("alert")).toBeNull();
		await press(screen.getByLabelText("List options"));
		await press(screen.getByLabelText("Change Theme…"));
		await press(screen.getByLabelText("Upload photo"));
		await press(await screen.findByLabelText("Delete photo beach.png"));
		await waitFor(() => expect(app.photoGateway.photos).toEqual([]));
		expect(screen.queryByLabelText("Confirm delete photo")).toBeNull();
	});
});
