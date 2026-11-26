import { Platform } from "react-native";

export interface SidebarMetrics {
	readonly rowHeight: number;
	readonly fontSize: number;
	readonly iconSize: number;
	readonly searchHeight: number;
	readonly strokeWidth: number;
	readonly headerAction: "logOut" | "signOut" | null;
}

const TOUCH: SidebarMetrics = {
	rowHeight: 44,
	fontSize: 14,
	iconSize: 20,
	searchHeight: 38,
	strokeWidth: 1.6,
	headerAction: "logOut",
};

const WEB: SidebarMetrics = { ...TOUCH, headerAction: "signOut" };

const WINDOWS: SidebarMetrics = {
	rowHeight: 28,
	fontSize: 13,
	iconSize: 16,
	searchHeight: 28,
	strokeWidth: 2,
	headerAction: "signOut",
};

const MACOS: SidebarMetrics = { ...WINDOWS, headerAction: null };

const BY_PLATFORM: Readonly<Record<string, SidebarMetrics>> = {
	macos: MACOS,
	windows: WINDOWS,
	web: WEB,
};

export function sidebarMetrics(platform: string = Platform.OS): SidebarMetrics {
	return BY_PLATFORM[platform] ?? TOUCH;
}
