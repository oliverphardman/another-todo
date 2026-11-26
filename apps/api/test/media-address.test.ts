import { describe, expect, it } from "vitest";
import { MediaAddress } from "../src/composition/media-address";
import { awsProviders } from "../src/infrastructure/aws/aws-providers";
import { startLocalApp } from "./support/local-app";

describe("MediaAddress", () => {
	it("is absent unless set", () => {
		expect(MediaAddress.from({})).toBeNull();
		expect(MediaAddress.from({ MEDIA_PUBLIC_URL: " " })).toBeNull();
	});

	it.each([
		"files.example.com",
		"ftp://files.example.com",
		"https://x.test/?a=1",
		"https://x.test/#a",
	])("rejects %s", (value) => {
		expect(() => MediaAddress.from({ MEDIA_PUBLIC_URL: value })).toThrow(
			"MEDIA_PUBLIC_URL must be an http or https address",
		);
	});

	it("must be a bare origin for S3", () => {
		const s3 = awsProviders.media.s3!;
		const env = { PHOTOS_BUCKET: "bucket" };
		expect(s3({ ...env, MEDIA_PUBLIC_URL: "https://files.example.com/" }, "u").router).toBeNull();
		expect(() => s3({ ...env, MEDIA_PUBLIC_URL: "https://example.com/files" }, "u")).toThrow(
			"MEDIA_PUBLIC_URL cannot have a path when media is stored in S3",
		);
	});
});

describe("local files on their own address", () => {
	it("links uploads and downloads to it and lets the web app upload across origins", async () => {
		const app = await startLocalApp({
			ENFORCED_USERNAME: "me",
			MEDIA_PUBLIC_URL: "https://files.example.com/",
		});
		const created = await fetch(`${app.base}/photos`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "n", contentType: "image/png", size: 3 }),
		});
		const photo = (await created.json()) as { photo: { url: string }; upload: { url: string } };
		expect(photo.upload.url).toBe("https://files.example.com/media/upload");
		expect(photo.photo.url.startsWith("https://files.example.com/media/files/")).toBe(true);
		const upload = await fetch(`${app.base}/media/upload`, {
			method: "POST",
			headers: { origin: "http://localhost:3000" },
		});
		expect(upload.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
	});
});
