import type { AttachmentRepository } from "../domain/attachment-repository";
import type { Task } from "../domain/task";
import type { components } from "../generated/api";

type TaskView = components["schemas"]["Task"];

export class TaskPresenter {
	constructor(private readonly attachments: Pick<AttachmentRepository, "list">) {}

	async present(task: Task): Promise<TaskView> {
		return (await this.presentAll([task]))[0]!;
	}

	async presentAll(tasks: readonly Task[]): Promise<TaskView[]> {
		const owners = [...new Set(tasks.map((task) => task.ownerId))];
		const attached = new Map(
			await Promise.all(
				owners.map(async (owner) => {
					const files = await this.attachments.list(owner);
					return [owner, new Set(files.map((file) => file.taskId))] as const;
				}),
			),
		);
		return tasks.map((task) => ({
			...(task.toJSON() as Omit<TaskView, "hasAttachments">),
			hasAttachments: attached.get(task.ownerId)!.has(task.id),
		}));
	}
}
