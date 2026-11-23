import type { MessageKey } from "../i18n/en-us";

export interface AttachmentData {
	readonly id: string;
	readonly taskId: string;
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
	readonly createdAt: string;
	readonly url: string;
}

export interface PickedFile {
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
	readonly body: Blob | { readonly uri: string; readonly name: string; readonly type: string };
}

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export class AttachmentRules {
	static problemWith(picked: PickedFile): MessageKey | null {
		if (picked.size < 1) {
			return "attachment.errorUnreadable";
		}
		if (picked.size > MAX_ATTACHMENT_BYTES) {
			return "attachment.errorSize";
		}
		return null;
	}
}
