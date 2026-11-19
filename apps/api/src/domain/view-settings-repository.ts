import type { ViewSettings } from "./view-settings";

export interface ViewSettingsRepository {
	save(settings: ViewSettings): Promise<void>;
	findById(ownerId: string, id: string): Promise<ViewSettings | null>;
	list(ownerId: string): Promise<ViewSettings[]>;
	delete(ownerId: string, id: string): Promise<void>;
}
