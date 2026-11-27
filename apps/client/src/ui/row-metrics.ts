import type { TextStyle, ViewStyle } from "react-native";
import type { RowStyle } from "../state/app-settings";

export interface RowMetrics {
	readonly height: number;
	readonly gap: number;
	readonly pitch: number;
	readonly textPadding: number;
	readonly titleSize: number;
	readonly circle: { readonly size: number; readonly strokeWidth: number };
	readonly circleControl: ViewStyle;
	readonly starSize: number;
	readonly starControl: ViewStyle;
	readonly subtitle: {
		readonly size: number;
		readonly iconSize: number;
		readonly separator: string;
		readonly separatorSize: number;
		readonly separatorMargin: number;
	};
	readonly listPadding: number;
	readonly heading: {
		readonly size: number;
		readonly weight: NonNullable<TextStyle["fontWeight"]>;
	};
	readonly section: {
		readonly height: number;
		readonly marginTop: number;
		readonly paddingVertical: number;
		readonly fontSize: number;
		readonly iconSize: number;
	};
	readonly addBar: {
		readonly height: number;
		readonly fontSize: number;
		readonly iconSize: number;
		readonly paddingHorizontal: number;
		readonly gap: number;
		readonly textPadding: number;
	};
}

const COZY_CONTROL: ViewStyle = { paddingHorizontal: 14, paddingVertical: 14 };

const METRICS: Readonly<Record<RowStyle, RowMetrics>> = {
	cozy: {
		height: 52,
		gap: 2,
		pitch: 54,
		textPadding: 8,
		titleSize: 15,
		circle: { size: 22, strokeWidth: 1.6 },
		circleControl: COZY_CONTROL,
		starSize: 20,
		starControl: COZY_CONTROL,
		subtitle: { size: 12, iconSize: 12, separator: "·", separatorSize: 12, separatorMargin: 4 },
		listPadding: 16,
		heading: { size: 28, weight: "600" },
		section: { height: 48, marginTop: 12, paddingVertical: 8, fontSize: 14, iconSize: 16 },
		addBar: {
			height: 52,
			fontSize: 15,
			iconSize: 22,
			paddingHorizontal: 14,
			gap: 12,
			textPadding: 12,
		},
	},
	compact: {
		height: 44,
		gap: 1,
		pitch: 45,
		textPadding: 2,
		titleSize: 13,
		circle: { size: 19, strokeWidth: 1.9 },
		circleControl: { paddingLeft: 12.5, paddingRight: 14.5, paddingVertical: 10 },
		starSize: 19,
		starControl: { paddingHorizontal: 11.5, paddingVertical: 10 },
		subtitle: { size: 12, iconSize: 11, separator: "•", separatorSize: 9, separatorMargin: 3 },
		listPadding: 12,
		heading: { size: 24, weight: "700" },
		section: { height: 30, marginTop: 6, paddingVertical: 4, fontSize: 12, iconSize: 12 },
		addBar: {
			height: 44,
			fontSize: 13,
			iconSize: 19,
			paddingHorizontal: 12.5,
			gap: 14.5,
			textPadding: 10,
		},
	},
};

export function rowMetrics(style: RowStyle): RowMetrics {
	return METRICS[style];
}
