import { beforeEach, describe, expect, it, vi } from "vitest";

const presign = vi.hoisted(() => ({
	createPresignedPost: vi.fn(),
	getSignedUrl: vi.fn(),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({ createPresignedPost: presign.createPresignedPost }));
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: presign.getSignedUrl }));

import { DeleteObjectCommand, GetObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { S3MediaStorage } from "../src/infrastructure/aws/s3-media-storage";

describe("S3MediaStorage", () => {
	const send = vi.fn();
	const client = { send } as unknown as S3Client;

	beforeEach(() => {
		send.mockReset().mockResolvedValue({});
		presign.createPresignedPost.mockReset().mockResolvedValue({
			url: "https://bucket.s3.amazonaws.com/",
			fields: { key: "u/1", policy: "p" },
		});
		presign.getSignedUrl.mockReset().mockResolvedValue("https://signed.example.com/u/1");
	});

	it("creates an upload form restricted to the content type and size", async () => {
		const storage = new S3MediaStorage(client, "bucket");
		const upload = await storage.createUpload("u/1", "image/png", 1000);
		expect(upload).toEqual({
			url: "https://bucket.s3.amazonaws.com/",
			fields: { key: "u/1", policy: "p" },
		});
		expect(presign.createPresignedPost).toHaveBeenCalledWith(client, {
			Bucket: "bucket",
			Key: "u/1",
			Conditions: [
				["content-length-range", 1, 1000],
				["eq", "$Content-Type", "image/png"],
			],
			Fields: { "Content-Type": "image/png" },
			Expires: 300,
		});
	});

	it("signs download links for an hour", async () => {
		const storage = new S3MediaStorage(client, "bucket");
		expect(await storage.downloadUrl("u/1")).toBe("https://signed.example.com/u/1");
		const [, command, options] = presign.getSignedUrl.mock.calls[0]!;
		expect(command).toBeInstanceOf(GetObjectCommand);
		expect(command.input).toEqual({
			Bucket: "bucket",
			Key: "u/1",
			ResponseContentDisposition: "attachment",
		});
		expect(options).toEqual({ expiresIn: 3600 });
	});

	it("publishes its links on another address without changing what was signed", async () => {
		presign.getSignedUrl.mockResolvedValue(
			"https://bucket.s3.us-east-1.amazonaws.com/u/1?X-Amz-Signature=abc%2F1",
		);
		const storage = new S3MediaStorage(client, "bucket", "https://files.example.com");
		expect(await storage.downloadUrl("u/1")).toBe(
			"https://files.example.com/u/1?X-Amz-Signature=abc%2F1",
		);
		expect((await storage.createUpload("u/1", "image/png", 10)).url).toBe(
			"https://files.example.com/",
		);
	});

	it("deletes objects", async () => {
		await new S3MediaStorage(client, "bucket").remove("u/1");
		const [command] = send.mock.calls[0]!;
		expect(command).toBeInstanceOf(DeleteObjectCommand);
		expect(command.input).toEqual({ Bucket: "bucket", Key: "u/1" });
	});
});
