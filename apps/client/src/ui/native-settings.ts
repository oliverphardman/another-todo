import { nativeSettingsBridge } from "./native-settings-bridge";

export interface NativeSettingsOption {
	readonly value: string;
	readonly label: string;
}

export interface NativeSettingsRow {
	readonly kind: "choice" | "preview" | "toggle" | "number" | "text" | "note" | "button";
	readonly key: string;
	readonly label: string;
	readonly value?: string;
	readonly detail?: string;
	readonly enabled?: boolean;
	readonly height?: number;
	readonly options?: readonly NativeSettingsOption[];
}

export interface NativeSettingsSection {
	readonly key: string;
	readonly title: string;
	readonly rows: readonly NativeSettingsRow[];
}

export interface NativeSettingsModel {
	readonly sections: readonly NativeSettingsSection[];
}

export interface NativeSettingsChange {
	readonly key: string;
	readonly value: string;
}

export interface NativeSettingsBridge {
	isAvailable(): boolean;
	show(model: NativeSettingsModel): void;
	nextChange(): Promise<NativeSettingsChange | null>;
}

export class NativeSettings {
	static bridge: NativeSettingsBridge = nativeSettingsBridge;
}
