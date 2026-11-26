import type {
	NativeSettingsBridge,
	NativeSettingsChange,
	NativeSettingsModel,
} from "./native-settings";

export interface DesktopSettingsModule {
	show(model: string): void;
	nextChange(): Promise<NativeSettingsChange | null>;
}

export class DesktopSettingsBridge implements NativeSettingsBridge {
	constructor(private readonly module: DesktopSettingsModule | null | undefined) {}

	isAvailable(): boolean {
		return this.module !== null && this.module !== undefined;
	}

	show(model: NativeSettingsModel): void {
		this.module!.show(JSON.stringify(model));
	}

	nextChange(): Promise<NativeSettingsChange | null> {
		return this.module!.nextChange();
	}
}
