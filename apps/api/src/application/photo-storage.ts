export interface PhotoUpload {
	readonly url: string;
	readonly fields: Record<string, string>;
}

export interface PhotoStorage {
	createUpload(key: string, contentType: string, maxBytes: number): Promise<PhotoUpload>;
	downloadUrl(key: string): Promise<string>;
	remove(key: string): Promise<void>;
}
