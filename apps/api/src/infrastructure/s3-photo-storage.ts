import { DeleteObjectCommand, GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { PhotoStorage, PhotoUpload } from "../application/photo-storage";

const UPLOAD_SECONDS = 300;
const DOWNLOAD_SECONDS = 3600;

export class S3PhotoStorage implements PhotoStorage {
	constructor(
		private readonly client: S3Client,
		private readonly bucket: string,
	) {}

	async createUpload(key: string, contentType: string, maxBytes: number): Promise<PhotoUpload> {
		const { url, fields } = await createPresignedPost(this.client, {
			Bucket: this.bucket,
			Key: key,
			Conditions: [
				["content-length-range", 1, maxBytes],
				["eq", "$Content-Type", contentType],
			],
			Fields: { "Content-Type": contentType },
			Expires: UPLOAD_SECONDS,
		});
		return { url, fields };
	}

	downloadUrl(key: string): Promise<string> {
		return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
			expiresIn: DOWNLOAD_SECONDS,
		});
	}

	async remove(key: string): Promise<void> {
		await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
	}
}
