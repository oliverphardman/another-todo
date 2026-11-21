import type { MediaStorage, MediaUpload } from "../../src/application/media-storage";

export class FakeMediaStorage implements MediaStorage {
	readonly uploads: { key: string; contentType: string; maxBytes: number }[] = [];
	readonly removed: string[] = [];
	failRemoval = false;

	async createUpload(key: string, contentType: string, maxBytes: number): Promise<MediaUpload> {
		this.uploads.push({ key, contentType, maxBytes });
		return { url: "https://upload.test/photos", fields: { key, "Content-Type": contentType } };
	}

	async downloadUrl(key: string): Promise<string> {
		return `https://photos.test/${key}?signature=abc`;
	}

	async remove(key: string): Promise<void> {
		if (this.failRemoval) {
			throw new Error("storage offline");
		}
		this.removed.push(key);
	}
}
