import type { AuthorizedHttp, Fetcher } from "../api/authorized-http";
import { FormUpload } from "../api/form-upload";
import type { components } from "../generated/api";
import type { AttachmentData, PickedFile } from "./attachment";
import type { AttachmentGateway } from "./attachment-gateway";

export class AttachmentUploadError extends Error {
	constructor() {
		super("The file could not be uploaded");
		this.name = "AttachmentUploadError";
	}
}

export class HttpAttachmentGateway implements AttachmentGateway {
	private readonly uploads: FormUpload;

	constructor(
		private readonly http: AuthorizedHttp,
		fetcher: Fetcher = (input, init) => fetch(input, init),
	) {
		this.uploads = new FormUpload(fetcher);
	}

	async list(taskId: string): Promise<AttachmentData[]> {
		const body = await this.http.request<components["schemas"]["AttachmentCollection"]>(
			"GET",
			HttpAttachmentGateway.path(taskId),
		);
		return body.attachments.map((attachment) => ({ ...attachment }));
	}

	async create(taskId: string, picked: PickedFile): Promise<AttachmentData> {
		const created = await this.http.request<components["schemas"]["CreatedAttachment"]>(
			"POST",
			HttpAttachmentGateway.path(taskId),
			{ name: picked.name, contentType: picked.contentType, size: picked.size },
		);
		if (!(await this.uploads.send(created.upload, picked))) {
			await this.remove(taskId, created.attachment.id).catch(() => undefined);
			throw new AttachmentUploadError();
		}
		return { ...created.attachment };
	}

	async remove(taskId: string, id: string): Promise<void> {
		await this.http.request(
			"DELETE",
			`${HttpAttachmentGateway.path(taskId)}/${encodeURIComponent(id)}`,
		);
	}

	private static path(taskId: string): string {
		return `/tasks/${encodeURIComponent(taskId)}/attachments`;
	}
}
