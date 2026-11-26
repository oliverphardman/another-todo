import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function start(width = 1280) {
	const app = await renderApp({ width });
	stop = app.stop;
	act(() => {
		app.connectivity.setOnline(false);
		app.container.store.select("tasks");
		app.container.store.addTask("Second");
		app.clock.advance(1000);
		app.container.store.addTask("First");
	});
	const task = (title: string) =>
		app.container.store.get().tasks.find((entry) => entry.title === title)!;
	return { ...app, task };
}

const note = () => screen.getByLabelText("Note") as HTMLTextAreaElement;
const title = () => screen.getByLabelText("Task title") as HTMLInputElement;
const type = (field: HTMLElement, value: string) => fireEvent.change(field, { target: { value } });

describe("task fields", () => {
	it("saves a note that is still being typed when another task is opened", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Open First"));
		type(note(), "Remember the milk");
		act(() => app.container.store.selectTask(app.task("Second").id));
		expect(app.task("First").note).toBe("Remember the milk");
		expect(app.task("Second").note).toBe("");
		expect(note().value).toBe("");
	});

	it("saves a title that is still being typed when another task is opened", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Open First"));
		type(title(), "First, renamed");
		fireEvent.click(screen.getByLabelText("Open Second"));
		expect(app.task("First, renamed")).toBeDefined();
		expect(title().value).toBe("Second");
	});

	it("saves when the details are closed", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Open First"));
		type(note(), "Kept");
		fireEvent.click(screen.getByLabelText("Close details"));
		await vi.waitFor(() => expect(app.task("First").note).toBe("Kept"));
	});

	it("saves once on leaving the field and not at all when nothing was typed", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Open First"));
		const saved = vi.spyOn(app.container.store, "setNote");
		const renamed = vi.spyOn(app.container.store, "renameTask");
		fireEvent.blur(note());
		fireEvent.blur(title());
		expect(saved).not.toHaveBeenCalled();
		expect(renamed).not.toHaveBeenCalled();
		type(note(), "Once");
		fireEvent.blur(note());
		fireEvent.blur(note());
		fireEvent.click(screen.getByLabelText("Open Second"));
		expect(saved).toHaveBeenCalledTimes(1);
	});

	it("takes a change made elsewhere instead of overwriting it", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Open First"));
		type(note(), "Mine, unsaved");
		act(() => app.container.store.setNote(app.task("First").id, "From another device"));
		expect(note().value).toBe("From another device");
		act(() => app.container.store.selectTask(app.task("Second").id));
		expect(app.task("First").note).toBe("From another device");
	});

	it("does not bring back a deleted task", async () => {
		const app = await start();
		fireEvent.click(screen.getByLabelText("Open First"));
		type(note(), "Gone");
		act(() => app.container.store.deleteTask(app.task("First").id));
		expect(app.container.store.get().tasks.map((entry) => entry.title)).toEqual(["Second"]);
	});
});
