import { Readable } from "node:stream";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Router, type Request as ExpressRequest, type Response as ExpressResponse } from "express";
import type { Clock } from "../../application/ports";
import type { MediaStorage, MediaUpload } from "../../application/media-storage";
import { Jwt } from "./jwt";

export const UPLOAD_SECONDS = 300;
export const DOWNLOAD_SECONDS = 3600;
const UPLOAD_AUDIENCE = "media-upload";
const DOWNLOAD_AUDIENCE = "media-download";

export class DiskMediaStorage implements MediaStorage {
	constructor(
		private readonly directory: string,
		private readonly publicUrl: string,
		private readonly jwt: Jwt,
		private readonly clock: Clock,
	) {}

	async createUpload(key: string, contentType: string, maxBytes: number): Promise<MediaUpload> {
		const token = this.jwt.sign({
			aud: UPLOAD_AUDIENCE,
			exp: this.expiry(UPLOAD_SECONDS),
			key,
			contentType,
			maxBytes,
		});
		return {
			url: `${this.publicUrl}/media/upload`,
			fields: { token, "Content-Type": contentType },
		};
	}

	async downloadUrl(key: string): Promise<string> {
		const token = this.jwt.sign({
			aud: DOWNLOAD_AUDIENCE,
			exp: this.expiry(DOWNLOAD_SECONDS),
			key,
		});
		return `${this.publicUrl}/media/files/${token}`;
	}

	async remove(key: string): Promise<void> {
		await rm(this.path(key), { force: true });
		await rm(`${this.path(key)}.type`, { force: true });
	}

	async write(key: string, contentType: string, bytes: Buffer): Promise<void> {
		await mkdir(this.directory, { recursive: true });
		await writeFile(this.path(key), bytes);
		await writeFile(`${this.path(key)}.type`, contentType);
	}

	async read(key: string): Promise<{ contentType: string; bytes: Buffer } | null> {
		try {
			return {
				contentType: await readFile(`${this.path(key)}.type`, "utf8"),
				bytes: await readFile(this.path(key)),
			};
		} catch {
			return null;
		}
	}

	private path(key: string): string {
		return join(this.directory, encodeURIComponent(key));
	}

	private expiry(seconds: number): number {
		return Math.floor(this.clock.now().getTime() / 1000) + seconds;
	}
}

export class DiskMediaRoutes {
	constructor(
		private readonly storage: DiskMediaStorage,
		private readonly jwt: Jwt,
		private readonly clock: Clock,
	) {}

	router(): Router {
		const router = Router();
		router.post("/media/upload", (request, response, next) => {
			this.receive(request, response).catch(next);
		});
		router.get("/media/files/:token", (request, response, next) => {
			this.serve(request.params.token!, response).catch(next);
		});
		return router;
	}

	private async receive(request: ExpressRequest, response: ExpressResponse): Promise<void> {
		const form = await new Request("http://localhost/", {
			method: "POST",
			headers: { "content-type": request.header("content-type") ?? "" },
			body: Readable.toWeb(request) as ReadableStream,
			duplex: "half",
		} as RequestInit)
			.formData()
			.catch(() => null);
		const token = form?.get("token");
		const file = form?.get("file");
		const claims =
			typeof token === "string" ? this.jwt.verify(token, UPLOAD_AUDIENCE, this.clock.now()) : null;
		if (claims === null || !(file instanceof Blob)) {
			response.status(403).json({ message: "The upload is not allowed" });
			return;
		}
		const { key, contentType, maxBytes } = claims as unknown as {
			key: string;
			contentType: string;
			maxBytes: number;
		};
		if (file.size < 1 || file.size > maxBytes || form?.get("Content-Type") !== contentType) {
			response.status(400).json({ message: "The file does not match the upload request" });
			return;
		}
		await this.storage.write(key, contentType, Buffer.from(await file.arrayBuffer()));
		response.status(204).end();
	}

	private async serve(token: string, response: import("express").Response): Promise<void> {
		const claims = this.jwt.verify(token, DOWNLOAD_AUDIENCE, this.clock.now());
		const stored = claims === null ? null : await this.storage.read(claims.key as string);
		if (stored !== null) {
			response
				.set("Content-Type", stored.contentType)
				.set("Cache-Control", "private, max-age=3600")
				.set("Content-Disposition", "attachment")
				.set("X-Content-Type-Options", "nosniff")
				.set("Content-Security-Policy", "sandbox")
				.send(stored.bytes);
			return;
		}
		response.status(404).json({ message: "Not found" });
	}
}
