import type { PickedPhoto } from "./photo";
import type { PhotoPicker } from "./photo-gateway";

export class UnavailablePhotoPicker implements PhotoPicker {
	async pick(): Promise<PickedPhoto | null> {
		return null;
	}
}
