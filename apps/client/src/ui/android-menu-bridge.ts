import type { NativeMenuBridge, NativeMenuRequest } from "./native-menu";

export interface AndroidMenuModule {
	show(items: string, x: number, y: number): Promise<string | null>;
}

export class AndroidMenuBridge implements NativeMenuBridge {
	constructor(private readonly module: AndroidMenuModule | null) {}

	isAvailable(): boolean {
		return this.module !== null;
	}

	show({ items, x, y }: NativeMenuRequest): Promise<string | null> {
		return this.module!.show(JSON.stringify(items), x, y);
	}
}
