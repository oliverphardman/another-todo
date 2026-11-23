import { Attachment } from "../domain/attachment";
import type { AttachmentRepository } from "../domain/attachment-repository";
import { NotFoundError, ValidationError } from "../domain/errors";
import type { TaskRepository } from "../domain/task-repository";
import type { Clock, IdGenerator } from "./ports";
import type { MediaStorage, MediaUpload } from "./media-storage";

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export interface AttachmentInput {
	readonly name?: unknown;
	readonly contentType?: unknown;
	readonly size?: unknown;
}

export interface AttachmentWithUrl {
	readonly attachment: Attachment;
	readonly url: string;
}

export interface CreatedAttachment extends AttachmentWithUrl {
	readonly upload: MediaUpload;
}

export interface AttachmentPurger {
	purgeTask(ownerId: string, taskId: string): Promise<void>;
}

export class AttachmentService implements AttachmentPurger {
	constructor(
		private readonly attachments: AttachmentRepository,
		private readonly tasks: TaskRepository,
		private readonly storage: MediaStorage,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async create(
		ownerId: string,
		taskId: string,
		input: AttachmentInput,
	): Promise<CreatedAttachment> {
		await this.requireTask(ownerId, taskId);
		const attachment = Attachment.create(
			ownerId,
			this.ids.next(),
			{ taskId, ...AttachmentService.details(input) },
			this.clock.now(),
		);
		const upload = await this.storage.createUpload(
			attachment.storageKey,
			attachment.contentType,
			MAX_ATTACHMENT_BYTES,
		);
		await this.attachments.save(attachment);
		return {
			attachment,
			url: await this.storage.downloadUrl(attachment.storageKey),
			upload,
		};
	}

	async list(ownerId: string, taskId: string): Promise<AttachmentWithUrl[]> {
		await this.requireTask(ownerId, taskId);
		const attachments = (await this.attachments.list(ownerId)).filter(
			(attachment) => attachment.taskId === taskId,
		);
		attachments.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
		);
		return Promise.all(
			attachments.map(async (attachment) => ({
				attachment,
				url: await this.storage.downloadUrl(attachment.storageKey),
			})),
		);
	}

	async delete(ownerId: string, taskId: string, id: string): Promise<void> {
		const attachment = await this.attachments.findById(ownerId, id);
		if (attachment === null || attachment.taskId !== taskId) {
			throw new NotFoundError(`Attachment ${id} not found`);
		}
		await this.storage.remove(attachment.storageKey);
		await this.attachments.delete(ownerId, id);
	}

	async purgeTask(ownerId: string, taskId: string): Promise<void> {
		for (const attachment of await this.attachments.list(ownerId)) {
			if (attachment.taskId === taskId) {
				await this.storage.remove(attachment.storageKey);
				await this.attachments.delete(ownerId, attachment.id);
			}
		}
	}

	private async requireTask(ownerId: string, taskId: string): Promise<void> {
		if ((await this.tasks.findById(ownerId, taskId)) === null) {
			throw new NotFoundError(`Task ${taskId} not found`);
		}
	}

	private static details(input: AttachmentInput): {
		name: string;
		contentType: string;
		size: number;
	} {
		const { name, contentType, size } = input;
		if (typeof name !== "string" || name.trim().length === 0 || name.length > 255) {
			throw new ValidationError("name must be 1 to 255 characters");
		}
		if (typeof contentType !== "string" || contentType.length === 0 || contentType.length > 127) {
			throw new ValidationError("contentType must be 1 to 127 characters");
		}
		if (
			typeof size !== "number" ||
			!Number.isInteger(size) ||
			size < 1 ||
			size > MAX_ATTACHMENT_BYTES
		) {
			throw new ValidationError(`size must be between 1 and ${MAX_ATTACHMENT_BYTES} bytes`);
		}
		return { name: name.trim(), contentType, size };
	}
}
