import type { PickedFile } from "./attachment";
import type { FilePicker } from "./attachment-gateway";

export class UnavailableFilePicker implements FilePicker {
	async pick(): Promise<PickedFile | null> {
		return null;
	}
}
