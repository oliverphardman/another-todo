import { describe, expect, it } from "vitest";
import { TaskPresenter } from "../src/http/task-presenter";
import { FixedClock, createServices } from "./support/fixtures";
import { InMemoryAttachmentRepository } from "../src/infrastructure/memory/in-memory-attachment-repository";
import { Attachment } from "../src/domain/attachment";

describe("TaskPresenter", () => {
	it("marks attachments per owner, asking each owner's files once", async () => {
		const { tasks } = createServices(new FixedClock());
		const mine = await tasks.create("me", { title: "Mine" });
		const theirs = await tasks.create("them", { title: "Theirs" });
		const files = new InMemoryAttachmentRepository();
		await files.save(
			Attachment.create(
				"them",
				"file",
				{ taskId: theirs.id, name: "n", contentType: "text/plain", size: 1 },
				new Date(),
			),
		);
		const asked: string[] = [];
		const presenter = new TaskPresenter({
			list: (owner) => {
				asked.push(owner);
				return files.list(owner);
			},
		});
		const views = await presenter.presentAll([mine, theirs, theirs]);
		expect(views.map((view) => view.hasAttachments)).toEqual([false, true, true]);
		expect(asked).toEqual(["me", "them"]);
		expect(await presenter.presentAll([])).toEqual([]);
	});
});
