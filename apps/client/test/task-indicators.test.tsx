import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Task } from "../src/domain/task";
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
		app.connectivity.setOnline(false);
		app.container.store.select("tasks");
		app.container.store.addTask("Oyster Architecture");
	});
	const task = () => app.container.store.get().tasks[0]!;
	const row = () => screen.getByLabelText("Open Oyster Architecture");
	return { ...app, task, row };
}

describe("task row indicators", () => {
	it("shows nothing extra on a plain task", async () => {
		const app = await start();
		expect(app.row().textContent).toBe("Oyster Architecture");
	});

	it("shows an icon with Note, but not for a blank note", async () => {
		const app = await start();
		act(() => app.container.store.setNote(app.task().id, "  \n "));
		expect(app.row().textContent).toBe("Oyster Architecture");
		act(() => app.container.store.setNote(app.task().id, "Shells"));
		expect(app.row().textContent).toBe("Oyster ArchitectureNote");
		expect(app.row().querySelectorAll("path")).toHaveLength(1);
	});

	it("shows My Day, attachment and note with their icons outside My Day", async () => {
		const app = await start();
		act(() => {
			app.container.store.setNote(app.task().id, "Shells");
			app.container.store.toggleMyDay(app.task().id);
			app.container.store.noteAttachments(app.task().id, true);
		});
		await waitFor(() =>
			expect(app.row().textContent).toBe("Oyster ArchitectureMy Day·Attachment·Note"),
		);
		expect(app.row().querySelectorAll("path")).toHaveLength(3);
		act(() => app.container.store.select("my-day"));
		expect(app.row().textContent).toBe("Oyster ArchitectureTasks·Attachment·Note");
	});

	it("updates as soon as a file is added to or removed from the open task", async () => {
		const app = await start();
		app.filePicker.next = {
			name: "plan.pdf",
			contentType: "application/pdf",
			size: 10,
			body: new Blob(["x"]),
		};
		const outbox = () => app.container.database.get().outbox.length;
		const queued = outbox();
		await act(async () => {
			await app.container.attachments.show(app.task().id);
			await app.container.attachments.add();
		});
		await waitFor(() => expect(app.row().textContent).toContain("Attachment"));
		expect(outbox()).toBe(queued);
		app.attachmentGateway.failure = new Error("offline");
		await act(async () => {
			await app.container.attachments.show(app.task().id);
		});
		expect(app.row().textContent).toContain("Attachment");
		app.attachmentGateway.failure = null;
		await act(async () => {
			await app.container.attachments.show(app.task().id);
			await app.container.attachments.remove("file-1");
		});
		await waitFor(() => expect(app.row().textContent).not.toContain("Attachment"));
	});

	it("saves nothing when the answer matches or the task is gone", async () => {
		const app = await start();
		const apply = vi.spyOn(app.container.database, "apply");
		app.container.store.noteAttachments(app.task().id, false);
		app.container.store.noteAttachments("missing", true);
		expect(apply).not.toHaveBeenCalled();
		act(() => {
			app.container.store.addTask("Other");
			app.container.store.noteAttachments(app.task().id, true);
		});
		fireEvent.click(app.row());
		expect(app.container.store.get().tasks.filter((task) => task.hasAttachments)).toHaveLength(1);
	});

	it("does not carry attachments over to copies and repeats", async () => {
		const app = await start();
		const attached = new Task({
			...app.task().data,
			completed: true,
			hasAttachments: true,
			repeat: { frequency: "daily" },
		});
		expect(attached.nextOccurrence("2026-11-19", "now")!.hasAttachments).toBe(false);
		act(() => {
			app.container.store.addList("Home");
		});
		const list = app.container.store.get().lists[0]!.id;
		act(() => {
			app.container.store.moveTask(app.task().id, list);
			app.container.store.noteAttachments(app.task().id, true);
		});
		await waitFor(() => expect(app.task().hasAttachments).toBe(true));
		act(() => void app.container.store.duplicateList(list, "Copy"));
		expect(app.container.store.get().tasks.map((task) => task.hasAttachments)).toEqual([
			true,
			false,
		]);
	});
});
