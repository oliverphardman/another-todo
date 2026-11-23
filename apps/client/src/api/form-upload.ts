import type { components } from "../generated/api";
import type { Fetcher } from "./authorized-http";

export interface UploadableFile {
	readonly name: string;
	readonly body: Blob | { readonly uri: string; readonly name: string; readonly type: string };
}

export class FormUpload {
	constructor(private readonly fetcher: Fetcher) {}

	async send(upload: components["schemas"]["PhotoUpload"], file: UploadableFile): Promise<boolean> {
		const form = new FormData();
		for (const [name, value] of Object.entries(upload.fields)) {
			form.append(name, value);
		}
		if (file.body instanceof Blob) {
			form.append("file", file.body, file.name);
		} else {
			form.append("file", file.body as never);
		}
		try {
			return (await this.fetcher(upload.url, { method: "POST", body: form })).ok;
		} catch {
			return false;
		}
	}
}
