import type { PickedFile } from "./attachment";
import type { FilePicker } from "./attachment-gateway";

export interface ChosenFile {
	readonly uri: string;
	readonly name: string;
	readonly size: number;
	readonly contentType: string;
}

export interface DesktopFileModule {
	pick(): Promise<ChosenFile | null>;
}

export class DesktopFilePicker implements FilePicker {
	constructor(private readonly module: DesktopFileModule | null | undefined) {}

	async pick(): Promise<PickedFile | null> {
		const chosen = (await this.module?.pick()) ?? null;
		if (chosen === null) {
			return null;
		}
		const { uri, name, size, contentType } = chosen;
		return { name, contentType, size, body: { uri, name, type: contentType } };
	}
}
