import type { PhotoData, PickedPhoto } from "./photo";

export interface PhotoGateway {
	list(): Promise<PhotoData[]>;
	create(picked: PickedPhoto): Promise<PhotoData>;
	remove(id: string): Promise<void>;
}

export interface PhotoPicker {
	pick(): Promise<PickedPhoto | null>;
}
