import { ViewSettings, type ViewSettingsRecord } from "../../domain/view-settings";
import type { ViewSettingsRepository } from "../../domain/view-settings-repository";
import { DynamoRepository } from "./dynamo-repository";

export class DynamoViewSettingsRepository
	extends DynamoRepository<ViewSettings, ViewSettingsRecord>
	implements ViewSettingsRepository
{
	protected toRecord(settings: ViewSettings): ViewSettingsRecord {
		return settings.toRecord();
	}

	protected restore(record: ViewSettingsRecord): ViewSettings {
		return ViewSettings.restore(record);
	}
}
