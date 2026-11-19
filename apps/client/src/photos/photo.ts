import type { MessageKey } from "../i18n/en-us";

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

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export class PhotoRules {
	static problemWith(picked: PickedPhoto): MessageKey | null {
		if (!ALLOWED_TYPES.includes(picked.contentType)) {
			return "photo.errorType";
		}
		if (picked.size < 1) {
			return "photo.errorUnreadable";
		}
		if (picked.size > MAX_PHOTO_BYTES) {
			return "photo.errorSize";
		}
		return null;
	}
}
