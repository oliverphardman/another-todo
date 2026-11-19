import type { Group } from "./group";

export interface GroupRepository {
	save(group: Group): Promise<void>;
	findById(ownerId: string, id: string): Promise<Group | null>;
	list(ownerId: string): Promise<Group[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
