import { InMemoryRepository } from "./in-memory-repository";
import type { Attachment } from "../../domain/attachment";
import type { AttachmentRepository } from "../../domain/attachment-repository";

export class InMemoryAttachmentRepository
	extends InMemoryRepository<Attachment>
	implements AttachmentRepository {}
