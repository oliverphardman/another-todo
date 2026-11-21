import { InMemoryRepository } from "./in-memory-repository";
import type { Photo } from "../../domain/photo";
import type { PhotoRepository } from "../../domain/photo-repository";

export class InMemoryPhotoRepository extends InMemoryRepository<Photo> implements PhotoRepository {}
