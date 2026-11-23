import type { AttachmentData, PickedFile } from "./attachment";

export interface AttachmentGateway {
	list(taskId: string): Promise<AttachmentData[]>;
	create(taskId: string, picked: PickedFile): Promise<AttachmentData>;
	remove(taskId: string, id: string): Promise<void>;
}

export interface FilePicker {
	pick(): Promise<PickedFile | null>;
}
