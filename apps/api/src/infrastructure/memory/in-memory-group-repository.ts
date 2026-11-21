import type { Group } from "../../domain/group";
import type { GroupRepository } from "../../domain/group-repository";
import { InMemoryRepository } from "./in-memory-repository";

export class InMemoryGroupRepository extends InMemoryRepository<Group> implements GroupRepository {}
