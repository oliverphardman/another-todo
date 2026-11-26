import { MEGABYTE } from "../attachments/upload-limit";
import type { LocalizedText } from "../i18n/i18n";

export interface PhotoData {
	readonly id: string;
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
	readonly createdAt: string;
	readonly url: string;
}

export interface PickedPhoto {
	readonly name: string;
	readonly contentType: string;
	readonly size: number;
	readonly body: Blob | { readonly uri: string; readonly name: string; readonly type: string };
}

export const MAX_PHOTO_BYTES = 5 * MEGABYTE;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class PhotoRules {
	static problemWith(
		picked: PickedPhoto,
		maxUploadBytes: number = MAX_PHOTO_BYTES,
	): LocalizedText | null {
		const maxBytes = Math.min(MAX_PHOTO_BYTES, maxUploadBytes);
		if (!ALLOWED_TYPES.includes(picked.contentType)) {
			return { key: "photo.errorType" };
		}
		if (picked.size < 1) {
			return { key: "photo.errorUnreadable" };
		}
		if (picked.size > maxBytes) {
			return { key: "photo.errorSize", params: { size: maxBytes / MEGABYTE } };
		}
		return null;
	}
}
