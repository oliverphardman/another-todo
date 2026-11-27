import { Platform } from "react-native";
import type { MenuStyle } from "../state/app-settings";

export interface MenuMetrics {
	readonly rowHeight: number;
	readonly fontSize: number;
	readonly iconSize: number;
	readonly strokeWidth: number;
	readonly searchHeight: number;
	readonly paddingStart: number;
	readonly paddingEnd: number;
	readonly labelGap: number;
	readonly indent: number;
	readonly countSize: number;
}

const TOUCH: MenuMetrics = {
	rowHeight: 44,
	fontSize: 14,
	iconSize: 20,
	strokeWidth: 1.6,
	searchHeight: 38,
	paddingStart: 16,
	paddingEnd: 16,
	labelGap: 12,
	indent: 20,
	countSize: 12,
};

const POINTER: MenuMetrics = {
	...TOUCH,
	rowHeight: 28,
	fontSize: 13,
	iconSize: 16,
	strokeWidth: 2,
	searchHeight: 28,
};

const COZY: MenuMetrics = {
	...TOUCH,
	strokeWidth: 1.4,
	paddingStart: 24,
	paddingEnd: 24,
	labelGap: 16,
	countSize: 14,
};

const COMPACT_BY_PLATFORM: Readonly<Record<string, MenuMetrics>> = {
	macos: POINTER,
	windows: POINTER,
};

export function menuMetrics(style: MenuStyle, platform: string = Platform.OS): MenuMetrics {
	return style === "cozy" ? COZY : (COMPACT_BY_PLATFORM[platform] ?? TOUCH);
}
