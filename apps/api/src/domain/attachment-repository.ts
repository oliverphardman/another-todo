import type { Attachment } from "./attachment";

export interface AttachmentRepository {
	save(attachment: Attachment): Promise<void>;
	findById(ownerId: string, id: string): Promise<Attachment | null>;
	list(ownerId: string): Promise<Attachment[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
