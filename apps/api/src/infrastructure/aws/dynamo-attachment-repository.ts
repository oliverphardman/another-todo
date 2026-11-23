import { Attachment, type AttachmentRecord } from "../../domain/attachment";
import type { AttachmentRepository } from "../../domain/attachment-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoAttachmentRepository
	extends DynamoRepository<Attachment, AttachmentRecord>
	implements AttachmentRepository
{
	protected toRecord(attachment: Attachment): AttachmentRecord {
		return attachment.toRecord();
	}

	protected restore(record: AttachmentRecord): Attachment {
		return Attachment.restore(record);
	}
}
