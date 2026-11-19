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
	act(() => app.connectivity.setOnline(false));
	act(() => {
		for (const title of ["Banana", "Apple", "Cherry"]) {
			app.clock.advance(1000);
			app.container.store.addTask(title);
		}
	});
	return app;
}

const titles = () =>
	Array.from(document.querySelectorAll<HTMLElement>('[aria-label^="Open "]')).map((row) =>
		row.getAttribute("aria-label")!.replace("Open ", ""),
	);

const sortBy = (label: string) => {
	fireEvent.click(screen.getByLabelText("List options"));
	fireEvent.click(screen.getByLabelText("Sort"));
	fireEvent.click(screen.getByLabelText(label));
};

describe("the sort chip", () => {
	it("is hidden until a sort is chosen, then names the sort and can be removed", async () => {
		const app = await start();
		expect(screen.queryByLabelText("Reverse sort order")).toBeNull();
		sortBy("Alphabetically");
		expect(screen.getByText("Sorted by Alphabetically")).toBeTruthy();
		expect(titles()).toEqual(["Apple", "Banana", "Cherry"]);
		fireEvent.click(screen.getByLabelText("Remove sorting"));
		expect(screen.queryByText("Sorted by Alphabetically")).toBeNull();
		expect(app.container.store.settingsFor("my-day").sort).toBeNull();
	});

	it("flips between ascending and descending with its arrow", async () => {
		const app = await start();
		sortBy("Alphabetically");
		const flip = screen.getByLabelText("Reverse sort order");
		expect(flip.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(flip);
		expect(titles()).toEqual(["Cherry", "Banana", "Apple"]);
		expect(screen.getByLabelText("Reverse sort order").getAttribute("aria-pressed")).toBe("true");
		expect(app.container.store.settingsFor("my-day").sortDescending).toBe(true);
		fireEvent.click(screen.getByLabelText("Reverse sort order"));
		expect(titles()).toEqual(["Apple", "Banana", "Cherry"]);
	});

	it("starts a newly chosen sort ascending and forgets the direction when removed", async () => {
		const app = await start();
		sortBy("Alphabetically");
		fireEvent.click(screen.getByLabelText("Reverse sort order"));
		sortBy("Creation Date");
		expect(app.container.store.settingsFor("my-day").sortDescending).toBe(false);
		fireEvent.click(screen.getByLabelText("Reverse sort order"));
		fireEvent.click(screen.getByLabelText("Remove sorting"));
		expect(app.container.store.settingsFor("my-day").sortDescending).toBe(false);
	});
});
