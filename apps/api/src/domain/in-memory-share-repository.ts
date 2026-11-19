import { InMemoryRepository } from "./in-memory-repository";
import type { Share } from "./share";
import type { ShareRepository } from "./share-repository";

export class InMemoryShareRepository extends InMemoryRepository<Share> implements ShareRepository {}
