import { Platform } from "react-native";

export interface SidebarMetrics {
	readonly rowHeight: number;
	readonly fontSize: number;
	readonly iconSize: number;
	readonly searchHeight: number;
	readonly strokeWidth: number;
	readonly headerAction: "settings" | null;
	readonly accountAction: "logOut" | "signOut";
}

const TOUCH: SidebarMetrics = {
	rowHeight: 44,
	fontSize: 14,
	iconSize: 20,
	searchHeight: 38,
	strokeWidth: 1.6,
	headerAction: "settings",
	accountAction: "logOut",
};

const WEB: SidebarMetrics = { ...TOUCH, accountAction: "signOut" };

const WINDOWS: SidebarMetrics = {
	rowHeight: 28,
	fontSize: 13,
	iconSize: 16,
	searchHeight: 28,
	strokeWidth: 2,
	headerAction: "settings",
	accountAction: "signOut",
};

const MACOS: SidebarMetrics = { ...WINDOWS, headerAction: null, accountAction: "logOut" };

const BY_PLATFORM: Readonly<Record<string, SidebarMetrics>> = {
	macos: MACOS,
	windows: WINDOWS,
	web: WEB,
};

export function sidebarMetrics(platform: string = Platform.OS): SidebarMetrics {
	return BY_PLATFORM[platform] ?? TOUCH;
}
