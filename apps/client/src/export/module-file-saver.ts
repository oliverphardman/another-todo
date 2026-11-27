import { Bytes } from "./bytes";
import type { FileSaver, SaveOutcome, SaveRequest } from "./file-saver";

export interface SaveModule {
	save(name: string, contentType: string, base64: string): Promise<boolean>;
}

export class ModuleFileSaver implements FileSaver {
	constructor(private readonly module: SaveModule | null | undefined) {}

	get available(): boolean {
		return this.module !== null && this.module !== undefined;
	}

	async save({ name, contentType, content }: SaveRequest): Promise<SaveOutcome> {
		const base64 = Bytes.toBase64(await content());
		return (await this.module!.save(name, contentType, base64)) ? "saved" : "cancelled";
	}
}
