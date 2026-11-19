import type { Group } from "./group";
import type { GroupRepository } from "./group-repository";
import { InMemoryRepository } from "./in-memory-repository";

export class InMemoryGroupRepository extends InMemoryRepository<Group> implements GroupRepository {}
