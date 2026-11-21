import { InMemoryRepository } from "./in-memory-repository";
import type { ViewSettings } from "../../domain/view-settings";
import type { ViewSettingsRepository } from "../../domain/view-settings-repository";

export class InMemoryViewSettingsRepository
	extends InMemoryRepository<ViewSettings>
	implements ViewSettingsRepository {}
