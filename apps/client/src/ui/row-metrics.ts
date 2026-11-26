import type { ViewStyle } from "react-native";
import type { RowStyle } from "../state/app-settings";

export interface RowMetrics {
	readonly height: number;
	readonly gap: number;
	readonly pitch: number;
	readonly textPadding: number;
	readonly control: ViewStyle;
}

const METRICS: Readonly<Record<RowStyle, RowMetrics>> = {
	cozy: {
		height: 52,
		gap: 2,
		pitch: 54,
		textPadding: 8,
		control: { paddingHorizontal: 14, paddingVertical: 14 },
	},
	compact: {
		height: 36,
		gap: 1,
		pitch: 37,
		textPadding: 2,
		control: { paddingHorizontal: 14, paddingVertical: 6 },
	},
};

export function rowMetrics(style: RowStyle): RowMetrics {
	return METRICS[style];
}
