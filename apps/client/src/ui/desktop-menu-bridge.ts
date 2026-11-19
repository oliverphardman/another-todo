import type { NativeMenuBridge, NativeMenuItem } from "./native-menu";

export interface DesktopMenuModule {
	show(items: readonly NativeMenuItem[], x: number, y: number): Promise<string | null>;
}

export class DesktopMenuBridge implements NativeMenuBridge {
	constructor(private readonly module: DesktopMenuModule | null | undefined) {}

	isAvailable(): boolean {
		return this.module !== null && this.module !== undefined;
	}

	show(items: readonly NativeMenuItem[], x: number, y: number): Promise<string | null> {
		return this.module!.show(items, x, y);
	}
}
