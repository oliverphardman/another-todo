import { EntityId } from "../domain/entity-id";
import { ValidationError } from "../domain/errors";
import type { PhotoRepository } from "../domain/photo-repository";
import { SORT_KEYS, ViewSettings, type SortKey, type ThemeSetting } from "../domain/view-settings";
import type { ViewSettingsRepository } from "../domain/view-settings-repository";
import type { Clock } from "./ports";

export interface ViewSettingsInput {
	readonly sort?: unknown;
	readonly sortDescending?: unknown;
	readonly hideCompleted?: unknown;
	readonly theme?: unknown;
}

const COLOR = /^#[0-9a-fA-F]{6}$/;

export class ViewSettingsService {
	constructor(
		private readonly settings: ViewSettingsRepository,
		private readonly photos: PhotoRepository,
		private readonly clock: Clock,
	) {}

	async list(ownerId: string): Promise<ViewSettings[]> {
		const all = await this.settings.list(ownerId);
		return all.sort((a, b) => a.id.localeCompare(b.id));
	}

	async put(ownerId: string, id: string, input: ViewSettingsInput): Promise<ViewSettings> {
		const settings = ViewSettings.create(
			ownerId,
			EntityId.parse(id),
			{
				sort: ViewSettingsService.sort(input.sort),
				sortDescending: ViewSettingsService.sortDescending(input.sortDescending),
				hideCompleted: ViewSettingsService.hideCompleted(input.hideCompleted),
				theme: await this.theme(ownerId, input.theme),
			},
			this.clock.now(),
		);
		await this.settings.save(settings);
		return settings;
	}

	private static sort(value: unknown): SortKey | null {
		if (value === null) {
			return null;
		}
		if (!SORT_KEYS.includes(value as SortKey)) {
			throw new ValidationError(`sort must be null or one of ${SORT_KEYS.join(", ")}`);
		}
		return value as SortKey;
	}

	private static sortDescending(value: unknown): boolean {
		if (value === undefined) {
			return false;
		}
		if (typeof value !== "boolean") {
			throw new ValidationError("sortDescending must be a boolean");
		}
		return value;
	}

	private static hideCompleted(value: unknown): boolean {
		if (typeof value !== "boolean") {
			throw new ValidationError("hideCompleted must be a boolean");
		}
		return value;
	}

	private async theme(ownerId: string, value: unknown): Promise<ThemeSetting | null> {
		if (value === null) {
			return null;
		}
		const { type, color, photoId, presetId } = (value ?? {}) as Record<string, unknown>;
		if (type === "color" && typeof color === "string" && COLOR.test(color)) {
			return { type: "color", color: color.toLowerCase() };
		}
		if (type === "photo") {
			const id = EntityId.parse(photoId);
			if ((await this.photos.findById(ownerId, id)) === null) {
				throw new ValidationError(`Photo ${id} does not exist`);
			}
			return { type: "photo", photoId: id };
		}
		if (type === "preset") {
			return { type: "preset", presetId: EntityId.parse(presetId) };
		}
		throw new ValidationError(
			"theme must be null, a #rrggbb color, an existing photo or a preset photo",
		);
	}
}
