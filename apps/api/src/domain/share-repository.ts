import type { Share } from "./share";

export interface ShareRepository {
	save(share: Share): Promise<void>;
	findById(ownerId: string, id: string): Promise<Share | null>;
	list(ownerId: string): Promise<Share[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
