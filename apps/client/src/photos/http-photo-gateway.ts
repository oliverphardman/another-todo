import type { AuthorizedHttp, Fetcher } from "../api/authorized-http";
import { FormUpload } from "../api/form-upload";
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
	private readonly uploads: FormUpload;

	constructor(
		private readonly http: AuthorizedHttp,
		fetcher: Fetcher = (input, init) => fetch(input, init),
	) {
		this.uploads = new FormUpload(fetcher);
	}

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
		if (!(await this.uploads.send(created.upload, picked))) {
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
}
