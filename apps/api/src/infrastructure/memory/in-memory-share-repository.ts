import { InMemoryRepository } from "./in-memory-repository";
import type { Share } from "../../domain/share";
import type { ShareRepository } from "../../domain/share-repository";

export class InMemoryShareRepository extends InMemoryRepository<Share> implements ShareRepository {}
