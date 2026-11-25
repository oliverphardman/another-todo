import type { MenuBarBridge } from "./menu-bar";

export const menuBarBridge: MenuBarBridge = {
	isAvailable: () => false,
	show: () => undefined,
	nextSelection: async () => null,
};
