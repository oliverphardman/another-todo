import type { LocalizedText } from "../i18n/i18n";
import { MEGABYTE } from "./upload-limit";

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

export class AttachmentRules {
	static problemWith(picked: PickedFile, maxBytes: number): LocalizedText | null {
		if (picked.size < 1) {
			return { key: "attachment.errorUnreadable" };
		}
		if (picked.size > maxBytes) {
			return { key: "attachment.errorSize", params: { size: maxBytes / MEGABYTE } };
		}
		return null;
	}
}
