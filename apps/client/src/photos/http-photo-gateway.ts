import type { AuthorizedHttp, Fetcher } from "../api/authorized-http";
import type { components } from "../generated/api";
import type { PhotoData, PickedPhoto } from "./photo";
import type { PhotoGateway } from "./photo-gateway";

export class PhotoUploadError extends Error {
	constructor() {
		super("The photo could not be uploaded");
		this.name = "PhotoUploadError";
	}
}

export class HttpPhotoGateway implements PhotoGateway {
	constructor(
		private readonly http: AuthorizedHttp,
		private readonly fetcher: Fetcher = (input, init) => fetch(input, init),
	) {}

	async list(): Promise<PhotoData[]> {
		const body = await this.http.request<components["schemas"]["PhotoCollection"]>(
			"GET",
			"/photos",
		);
		return body.photos.map((photo) => ({ ...photo }));
	}

	async create(picked: PickedPhoto): Promise<PhotoData> {
		const created = await this.http.request<components["schemas"]["CreatedPhoto"]>(
			"POST",
			"/photos",
			{
				name: picked.name,
				contentType: picked.contentType,
				size: picked.size,
			},
		);
		if (!(await this.upload(created.upload, picked))) {
			await this.http
				.request("DELETE", `/photos/${encodeURIComponent(created.photo.id)}`)
				.catch(() => undefined);
			throw new PhotoUploadError();
		}
		return { ...created.photo };
	}

	async remove(id: string): Promise<void> {
		await this.http.request("DELETE", `/photos/${encodeURIComponent(id)}`);
	}

	private async upload(
		upload: components["schemas"]["PhotoUpload"],
		picked: PickedPhoto,
	): Promise<boolean> {
		const form = new FormData();
		for (const [name, value] of Object.entries(upload.fields)) {
			form.append(name, value);
		}
		if (picked.body instanceof Blob) {
			form.append("file", picked.body, picked.name);
		} else {
			form.append("file", picked.body as never);
		}
		try {
			return (await this.fetcher(upload.url, { method: "POST", body: form })).ok;
		} catch {
			return false;
		}
	}
}
