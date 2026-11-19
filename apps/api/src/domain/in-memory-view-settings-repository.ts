import { InMemoryRepository } from "./in-memory-repository";
import type { ViewSettings } from "./view-settings";
import type { ViewSettingsRepository } from "./view-settings-repository";

export class InMemoryViewSettingsRepository
	extends InMemoryRepository<ViewSettings>
	implements ViewSettingsRepository {}
