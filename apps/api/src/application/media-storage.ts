export interface MediaUpload {
	readonly url: string;
	readonly fields: Record<string, string>;
}

export interface MediaStorage {
	createUpload(key: string, contentType: string, maxBytes: number): Promise<MediaUpload>;
	downloadUrl(key: string): Promise<string>;
	remove(key: string): Promise<void>;
}
