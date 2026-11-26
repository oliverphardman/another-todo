import type { NativeMenuBridge, NativeMenuItem, NativeMenuRequest } from "./native-menu";

export interface ActionSheetOptions {
	options: string[];
	cancelButtonIndex: number;
	destructiveButtonIndex: number[];
	disabledButtonIndices: number[];
}

export interface ActionSheet {
	showActionSheetWithOptions(options: ActionSheetOptions, chosen: (index: number) => void): void;
}

export class ActionSheetMenuBridge implements NativeMenuBridge {
	constructor(private readonly sheet: ActionSheet) {}

	isAvailable(): boolean {
		return true;
	}

	async show(request: NativeMenuRequest): Promise<string | null> {
		const items = request.items.filter((item) => item.kind !== "separator");
		const index = await new Promise<number>((resolve) =>
			this.sheet.showActionSheetWithOptions(
				ActionSheetMenuBridge.options(items, request.cancelLabel),
				resolve,
			),
		);
		const chosen = items[index];
		if (chosen === undefined) {
			return null;
		}
		return chosen.kind === "submenu"
			? this.show({ ...request, items: chosen.children! })
			: chosen.key;
	}

	private static options(
		items: readonly NativeMenuItem[],
		cancelLabel: string,
	): ActionSheetOptions {
		const indices = (matches: (item: NativeMenuItem) => boolean) =>
			items.flatMap((item, index) => (matches(item) ? [index] : []));
		return {
			options: [
				...items.map((item) => (item.checked === true ? `✓ ${item.label}` : item.label)),
				cancelLabel,
			],
			cancelButtonIndex: items.length,
			destructiveButtonIndex: indices((item) => item.destructive === true),
			disabledButtonIndices: indices((item) => item.disabled === true),
		};
	}
}
