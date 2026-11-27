import { Platform } from "react-native";

export interface SidebarActions {
	readonly headerAction: "settings" | null;
	readonly accountAction: "logOut" | "signOut";
}

const TOUCH: SidebarActions = { headerAction: "settings", accountAction: "logOut" };

const BY_PLATFORM: Readonly<Record<string, SidebarActions>> = {
	macos: { headerAction: null, accountAction: "logOut" },
	windows: { headerAction: "settings", accountAction: "signOut" },
	web: { headerAction: "settings", accountAction: "signOut" },
};

export function sidebarActions(platform: string = Platform.OS): SidebarActions {
	return BY_PLATFORM[platform] ?? TOUCH;
}
