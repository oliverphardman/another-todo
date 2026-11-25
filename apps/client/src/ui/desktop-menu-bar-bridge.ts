import type { MenuBarBridge } from "./menu-bar";
import type { NativeMenuItem } from "./native-menu";

export interface DesktopMenuBarModule {
	setMenuBar?(menus: readonly NativeMenuItem[]): void;
	nextMenuBarSelection?(): Promise<string | null>;
}

export class DesktopMenuBarBridge implements MenuBarBridge {
	constructor(private readonly module: DesktopMenuBarModule | null | undefined) {}

	isAvailable(): boolean {
		return typeof this.module?.setMenuBar === "function";
	}

	show(menus: readonly NativeMenuItem[]): void {
		this.module!.setMenuBar!(menus);
	}

	nextSelection(): Promise<string | null> {
		return this.module!.nextMenuBarSelection!();
	}
}
