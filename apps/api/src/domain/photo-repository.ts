import type { Photo } from "./photo";

export interface PhotoRepository {
	save(photo: Photo): Promise<void>;
	findById(ownerId: string, id: string): Promise<Photo | null>;
	list(ownerId: string): Promise<Photo[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
