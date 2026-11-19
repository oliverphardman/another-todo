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
	static problemWith(picked: PickedPhoto): string | null {
		if (!ALLOWED_TYPES.includes(picked.contentType)) {
			return "Choose a JPEG, PNG or WebP image.";
		}
		if (picked.size < 1) {
			return "That photo could not be read.";
		}
		if (picked.size > MAX_PHOTO_BYTES) {
			return "Photos must be 5 MB or smaller.";
		}
		return null;
	}
}
