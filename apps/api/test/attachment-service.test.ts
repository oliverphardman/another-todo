import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../src/domain/errors";
import { FixedClock, createServices } from "./support/fixtures";

const input = { name: " Report.pdf ", contentType: "application/pdf", size: 1000 };

async function withTask() {
	const services = createServices(new FixedClock());
	const task = await services.tasks.create("u", { title: "Task" });
	return { ...services, task };
}

describe("AttachmentService", () => {
	it("registers an attachment and returns a signed upload", async () => {
		const { attachments, storage, task } = await withTask();
		const created = await attachments.create("u", task.id, input);
		expect(created.attachment.name).toBe("Report.pdf");
		expect(created.attachment.taskId).toBe(task.id);
		expect(created.attachment.storageKey).toBe(`u/attachments/${created.attachment.id}`);
		expect(created.url).toContain(created.attachment.storageKey);
		expect(storage.uploads).toEqual([
			{
				key: created.attachment.storageKey,
				contentType: "application/pdf",
				maxBytes: 25 * 1024 * 1024,
			},
		]);
		expect(JSON.stringify(created.attachment.toView(created.url))).not.toContain("ownerId");
	});

	it("validates the name, type and size", async () => {
		const { attachments, task } = await withTask();
		const bad: Record<string, unknown>[] = [
			{ ...input, name: "" },
			{ ...input, name: "  " },
			{ ...input, name: 5 },
			{ ...input, name: "x".repeat(256) },
			{ ...input, contentType: "" },
			{ ...input, contentType: undefined },
			{ ...input, contentType: "x".repeat(128) },
			{ ...input, size: 0 },
			{ ...input, size: 1.5 },
			{ ...input, size: "big" },
			{ ...input, size: 25 * 1024 * 1024 + 1 },
		];
		for (const value of bad) {
			await expect(attachments.create("u", task.id, value)).rejects.toThrow(ValidationError);
		}
	});

	it("only accepts attachments for the caller's own tasks", async () => {
		const { attachments, task } = await withTask();
		await expect(attachments.create("other", task.id, input)).rejects.toThrow(NotFoundError);
		await expect(attachments.list("other", task.id)).rejects.toThrow(NotFoundError);
		await expect(attachments.create("u", "missing", input)).rejects.toThrow(NotFoundError);
	});

	it("lists a task's attachments oldest first", async () => {
		const clock = new FixedClock();
		const { attachments, tasks } = createServices(clock);
		const first = await tasks.create("u", { title: "One" });
		const second = await tasks.create("u", { title: "Two" });
		const a = await attachments.create("u", first.id, input);
		const b = await attachments.create("u", first.id, input);
		clock.advance(1000);
		const c = await attachments.create("u", first.id, input);
		await attachments.create("u", second.id, input);
		const listed = await attachments.list("u", first.id);
		expect(listed.map((entry) => entry.attachment.id)).toEqual([
			a.attachment.id,
			b.attachment.id,
			c.attachment.id,
		]);
	});

	it("deletes the object and record", async () => {
		const { attachments, storage, task } = await withTask();
		const { attachment } = await attachments.create("u", task.id, input);
		await attachments.delete("u", task.id, attachment.id);
		expect(storage.removed).toEqual([attachment.storageKey]);
		expect(await attachments.list("u", task.id)).toEqual([]);
		await expect(attachments.delete("u", task.id, attachment.id)).rejects.toThrow(NotFoundError);
	});

	it("refuses to delete an attachment through another task", async () => {
		const { attachments, tasks, task } = await withTask();
		const other = await tasks.create("u", { title: "Other" });
		const { attachment } = await attachments.create("u", task.id, input);
		await expect(attachments.delete("u", other.id, attachment.id)).rejects.toThrow(NotFoundError);
	});

	it("removes attachments when the task or its list is deleted", async () => {
		const { attachments, tasks, lists, storage, task } = await withTask();
		const first = await attachments.create("u", task.id, input);
		const neighbor = await tasks.create("u", { title: "Neighbor" });
		await attachments.create("u", neighbor.id, input);
		await tasks.delete("u", task.id);
		expect(storage.removed).toEqual([first.attachment.storageKey]);
		const list = await lists.create("u", { name: "List" });
		const inList = await tasks.create("u", { title: "In list", listId: list.id });
		const second = await attachments.create("u", inList.id, input);
		await lists.delete("u", list.id);
		expect(storage.removed).toContain(second.attachment.storageKey);
	});
});
