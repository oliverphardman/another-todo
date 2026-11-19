import { Photo, type PhotoRecord } from "../domain/photo";
import type { PhotoRepository } from "../domain/photo-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoPhotoRepository
	extends DynamoRepository<Photo, PhotoRecord>
	implements PhotoRepository
{
	protected toRecord(photo: Photo): PhotoRecord {
		return photo.toRecord();
	}

	protected restore(record: PhotoRecord): Photo {
		return Photo.restore(record);
	}
}
