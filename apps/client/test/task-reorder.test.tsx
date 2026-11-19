import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Task } from "../src/domain/task";
import { TaskSorter } from "../src/domain/task-sorter";
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
	act(() => app.connectivity.setOnline(false));
	act(() => {
		for (const title of ["First", "Second", "Third"]) {
			app.clock.advance(1000);
			app.container.store.addTask(title);
		}
	});
	return app;
}

type App = Awaited<ReturnType<typeof start>>;

const order = (app: App) => app.container.store.visibleTasks().open.map((task) => task.title);

function layoutRows() {
	Array.from(document.querySelectorAll<HTMLElement>("[data-task-row]")).forEach((row, index) => {
		row.getBoundingClientRect = () =>
			({ top: index * 60, height: 60, bottom: index * 60 + 60 }) as DOMRect;
	});
}

describe("Task manual position", () => {
	it("defaults to newest first, and a position overrides it", () => {
		const old = Task.create("a", "Old", "2026-01-01T00:00:00.000Z");
		const recent = Task.create("b", "Recent", "2026-02-01T00:00:00.000Z");
		const compare = TaskSorter.comparator(null, "newest", "2026-11-19");
		expect([old, recent].sort(compare).map((task) => task.id)).toEqual(["b", "a"]);
		const moved = old.with({ position: recent.manualKey - 1 });
		expect([recent, moved].sort(compare).map((task) => task.id)).toEqual(["a", "b"]);
		expect(Task.create("c", "Bad", "x").manualKey).toBe(0);
		expect(old.with({ position: null }).manualKey).toBe(old.manualKey);
	});
});

describe("reordering tasks in the store", () => {
	it("moves a task to any place, ignoring no-ops, unknown tasks and sorted or date-ordered views", async () => {
		const app = await start();
		const store = app.container.store;
		const ids = store.visibleTasks().open.map((task) => task.id);
		expect(order(app)).toEqual(["Third", "Second", "First"]);
		act(() => store.reorderTask(ids[0]!, 2));
		expect(order(app)).toEqual(["Second", "First", "Third"]);
		act(() => store.reorderTask(ids[0]!, 0));
		expect(order(app)).toEqual(["Third", "Second", "First"]);
		act(() => store.reorderTask(ids[2]!, 1));
		expect(order(app)).toEqual(["Third", "First", "Second"]);
		act(() => store.reorderTask(ids[1]!, 1));
		expect(order(app)).toEqual(["Third", "Second", "First"]);
		act(() => store.reorderTask(ids[2]!, 0));
		expect(order(app)).toEqual(["First", "Third", "Second"]);
		act(() => store.reorderTask(ids[2]!, 0));
		act(() => store.reorderTask("ghost", 1));
		act(() => store.reorderTask(ids[1]!, 99));
		expect(order(app)).toEqual(["First", "Third", "Second"]);
		act(() => store.updateSettings(store.selectedView.id, { sort: "alphabetical" }));
		const before = order(app);
		act(() => store.reorderTask(ids[0]!, 2));
		expect(order(app)).toEqual(before);
		act(() => store.updateSettings(store.selectedView.id, { sort: null }));
		act(() => store.select("planned"));
		act(() => store.reorderTask(ids[0]!, 0));
	});
});

describe("dragging tasks", () => {
	it("drags a task up, marks the drop place and ignores the click that follows", async () => {
		const app = await start();
		layoutRows();
		fireEvent.mouseDown(screen.getByLabelText("Open First"), { clientY: 150 });
		fireEvent.mouseMove(window, { clientY: 152 });
		fireEvent.mouseMove(window, { clientY: 5 });
		const marked = Array.from(document.querySelectorAll<HTMLElement>("[data-task-row]")).filter(
			(row) => row.dataset.dropMarker === "before",
		);
		expect(marked).toHaveLength(1);
		fireEvent.mouseUp(window, { clientY: 5 });
		expect(order(app)).toEqual(["First", "Third", "Second"]);
		fireEvent.click(screen.getByLabelText("Open First"));
		expect(app.container.store.get().selectedTaskIds).toEqual([]);
		fireEvent.click(screen.getByLabelText("Open First"));
		expect(app.container.store.get().selectedTaskIds).toHaveLength(1);
	});

	it("drags to the end, shows the marker below the last task and treats small moves as clicks", async () => {
		const app = await start();
		layoutRows();
		fireEvent.mouseDown(screen.getByLabelText("Open Third"), { clientY: 30 });
		fireEvent.mouseMove(window, { clientY: 400 });
		const after = Array.from(document.querySelectorAll<HTMLElement>("[data-task-row]")).filter(
			(row) => row.dataset.dropMarker === "after",
		);
		expect(after).toHaveLength(1);
		fireEvent.mouseUp(window, { clientY: 400 });
		expect(order(app)).toEqual(["Second", "First", "Third"]);
		fireEvent.click(screen.getByLabelText("Open Third"));
		fireEvent.click(screen.getByLabelText("Open Third"));
		fireEvent.mouseDown(screen.getByLabelText("Open Second"), { clientY: 20 });
		fireEvent.mouseMove(window, { clientY: 22 });
		fireEvent.mouseUp(window, { clientY: 22 });
		expect(order(app)).toEqual(["Second", "First", "Third"]);
	});

	it("does not start a drag when the list is sorted or the task is completed", async () => {
		const app = await start();
		const store = app.container.store;
		act(() => store.updateSettings(store.selectedView.id, { sort: "alphabetical" }));
		layoutRows();
		fireEvent.mouseDown(screen.getByLabelText("Open First"), { clientY: 20 });
		fireEvent.mouseMove(window, { clientY: 300 });
		fireEvent.mouseUp(window, { clientY: 300 });
		expect(order(app)).toEqual(["First", "Second", "Third"]);
	});
});
