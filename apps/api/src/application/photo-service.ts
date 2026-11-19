import { ValidationError, NotFoundError } from "../domain/errors";
import { Photo } from "../domain/photo";
import type { PhotoRepository } from "../domain/photo-repository";
import type { ViewSettingsRepository } from "../domain/view-settings-repository";
import type { Clock, IdGenerator } from "./ports";
import type { PhotoStorage, PhotoUpload } from "./photo-storage";

export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface PhotoInput {
	readonly name?: unknown;
	readonly contentType?: unknown;
	readonly size?: unknown;
}

export interface PhotoWithUrl {
	readonly photo: Photo;
	readonly url: string;
}

export interface CreatedPhoto extends PhotoWithUrl {
	readonly upload: PhotoUpload;
}

export class PhotoService {
	constructor(
		private readonly photos: PhotoRepository,
		private readonly settings: ViewSettingsRepository,
		private readonly storage: PhotoStorage,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
	) {}

	async create(ownerId: string, input: PhotoInput): Promise<CreatedPhoto> {
		const photo = Photo.create(
			ownerId,
			this.ids.next(),
			PhotoService.details(input),
			this.clock.now(),
		);
		const upload = await this.storage.createUpload(
			photo.storageKey,
			photo.contentType,
			MAX_PHOTO_BYTES,
		);
		await this.photos.save(photo);
		return { photo, url: await this.storage.downloadUrl(photo.storageKey), upload };
	}

	async list(ownerId: string): Promise<PhotoWithUrl[]> {
		const photos = await this.photos.list(ownerId);
		photos.sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
		);
		return Promise.all(
			photos.map(async (photo) => ({
				photo,
				url: await this.storage.downloadUrl(photo.storageKey),
			})),
		);
	}

	async delete(ownerId: string, id: string): Promise<void> {
		const photo = await this.photos.findById(ownerId, id);
		if (photo === null) {
			throw new NotFoundError(`Photo ${id} not found`);
		}
		await this.storage.remove(photo.storageKey);
		for (const settings of await this.settings.list(ownerId)) {
			if (settings.theme?.type === "photo" && settings.theme.photoId === id) {
				await this.settings.save(settings.withoutTheme(this.clock.now()));
			}
		}
		await this.photos.delete(ownerId, id);
	}

	private static details(input: PhotoInput): {
		name: string;
		contentType: string;
		size: number;
	} {
		const { name, contentType, size } = input;
		if (typeof name !== "string" || name.trim().length === 0 || name.length > 120) {
			throw new ValidationError("name must be 1 to 120 characters");
		}
		if (!PHOTO_CONTENT_TYPES.includes(contentType as (typeof PHOTO_CONTENT_TYPES)[number])) {
			throw new ValidationError(`contentType must be one of ${PHOTO_CONTENT_TYPES.join(", ")}`);
		}
		if (typeof size !== "number" || !Number.isInteger(size) || size < 1 || size > MAX_PHOTO_BYTES) {
			throw new ValidationError(`size must be between 1 and ${MAX_PHOTO_BYTES} bytes`);
		}
		return { name: name.trim(), contentType: contentType as string, size };
	}
}
