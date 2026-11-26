import { Platform } from "react-native";

export interface SidebarMetrics {
	readonly rowHeight: number;
	readonly fontSize: number;
	readonly iconSize: number;
	readonly searchHeight: number;
	readonly strokeWidth: number;
	readonly signOutInHeader: boolean;
}

const TOUCH: SidebarMetrics = {
	rowHeight: 44,
	fontSize: 14,
	iconSize: 20,
	searchHeight: 38,
	strokeWidth: 1.6,
	signOutInHeader: true,
};

const WINDOWS: SidebarMetrics = {
	rowHeight: 28,
	fontSize: 13,
	iconSize: 16,
	searchHeight: 28,
	strokeWidth: 2,
	signOutInHeader: true,
};

const MACOS: SidebarMetrics = { ...WINDOWS, signOutInHeader: false };

const BY_PLATFORM: Readonly<Record<string, SidebarMetrics>> = { macos: MACOS, windows: WINDOWS };

export function sidebarMetrics(platform: string = Platform.OS): SidebarMetrics {
	return BY_PLATFORM[platform] ?? TOUCH;
}
