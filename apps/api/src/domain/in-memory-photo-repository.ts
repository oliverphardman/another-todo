import { InMemoryRepository } from "./in-memory-repository";
import type { Photo } from "./photo";
import type { PhotoRepository } from "./photo-repository";

export class InMemoryPhotoRepository extends InMemoryRepository<Photo> implements PhotoRepository {}
