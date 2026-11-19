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

const order = (app: Awaited<ReturnType<typeof start>>) =>
	app.container.store.orderedLists().map((list) => list.name);

function layoutRows() {
	const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-list-row]"));
	rows.forEach((row, index) => {
		row.getBoundingClientRect = () =>
			({ top: index * 40, height: 40, bottom: index * 40 + 40 }) as DOMRect;
	});
	return rows;
}

describe("reordering lists from the menu", () => {
	it("moves a list up or down and disables the moves at the ends", async () => {
		const app = await start();
		fireEvent.contextMenu(screen.getByLabelText("Gamma"));
		fireEvent.click(screen.getByLabelText("Move List Up"));
		expect(order(app)).toEqual(["Alpha", "Gamma", "Beta"]);
		fireEvent.contextMenu(screen.getByLabelText("Gamma"));
		fireEvent.click(screen.getByLabelText("Move List Down"));
		expect(order(app)).toEqual(["Alpha", "Beta", "Gamma"]);
		fireEvent.contextMenu(screen.getByLabelText("Alpha"));
		expect(screen.getByLabelText("Move List Up").getAttribute("aria-disabled")).toBe("true");
		fireEvent.click(screen.getByLabelText("Close menu"));
		fireEvent.contextMenu(screen.getByLabelText("Gamma"));
		expect(screen.getByLabelText("Move List Down").getAttribute("aria-disabled")).toBe("true");
	});
});

describe("reordering lists by dragging", () => {
	it("drags a list above another and shows where it will land", async () => {
		const app = await start();
		const rows = layoutRows();
		expect(rows).toHaveLength(3);
		const gamma = screen.getByLabelText("Gamma");
		fireEvent.mouseDown(gamma, { clientY: 100 });
		fireEvent.mouseMove(window, { clientY: 102 });
		fireEvent.mouseMove(window, { clientY: 5 });
		fireEvent.mouseUp(window, { clientY: 5 });
		expect(order(app)).toEqual(["Gamma", "Alpha", "Beta"]);
	});

	it("drags a list to the end and ignores the click that follows a drag", async () => {
		const app = await start();
		layoutRows();
		fireEvent.mouseDown(screen.getByLabelText("Alpha"), { clientY: 0 });
		fireEvent.mouseMove(window, { clientY: 500 });
		fireEvent.mouseUp(window, { clientY: 500 });
		expect(order(app)).toEqual(["Beta", "Gamma", "Alpha"]);
		fireEvent.click(screen.getByLabelText("Alpha"));
		expect(app.container.store.get().selectedViewId).toBe("my-day");
		fireEvent.click(screen.getByLabelText("Alpha"));
		expect(app.container.store.get().selectedViewId).not.toBe("my-day");
	});

	it("treats a small movement as a click and marks the drop target while dragging", async () => {
		const app = await start();
		layoutRows();
		fireEvent.mouseDown(screen.getByLabelText("Beta"), { clientY: 50 });
		fireEvent.mouseMove(window, { clientY: 52 });
		fireEvent.mouseUp(window, { clientY: 52 });
		expect(order(app)).toEqual(["Alpha", "Beta", "Gamma"]);
		fireEvent.click(screen.getByLabelText("Beta"));
		expect(app.container.store.get().selectedViewId).not.toBe("my-day");
		fireEvent.mouseDown(screen.getByLabelText("Gamma"), { clientY: 100 });
		fireEvent.mouseMove(window, { clientY: 60 });
		const marked = Array.from(document.querySelectorAll<HTMLElement>("[data-list-row]")).filter(
			(row) => row.dataset.dropMarker === "before",
		);
		expect(marked.map((row) => row.getAttribute("aria-label"))).toEqual(["Beta"]);
		fireEvent.mouseMove(window, { clientY: 500 });
		const after = Array.from(document.querySelectorAll<HTMLElement>("[data-list-row]")).filter(
			(row) => row.dataset.dropMarker === "after",
		);
		expect(after.map((row) => row.getAttribute("aria-label"))).toEqual(["Beta"]);
		fireEvent.mouseUp(window, { clientY: 500 });
		expect(order(app)).toEqual(["Alpha", "Beta", "Gamma"]);
	});
});
