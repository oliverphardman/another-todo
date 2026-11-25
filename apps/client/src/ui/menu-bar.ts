import { menuBarBridge } from "./menu-bar-bridge";
import type { NativeMenuItem } from "./native-menu";

export interface MenuBarBridge {
	isAvailable(): boolean;
	show(menus: readonly NativeMenuItem[]): void;
	nextSelection(): Promise<string | null>;
}

export class MenuBar {
	static bridge: MenuBarBridge = menuBarBridge;
}
