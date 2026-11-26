import type { ContextMenuEntry } from "./context-menu";
import { nativeMenuBridge } from "./native-menu-bridge";

export interface NativeMenuItem {
	readonly key: string;
	readonly label: string;
	readonly kind: "action" | "submenu" | "separator";
	readonly disabled?: boolean;
	readonly destructive?: boolean;
	readonly checked?: boolean;
	readonly children?: readonly NativeMenuItem[];
}

export interface NativeMenuRequest {
	readonly items: readonly NativeMenuItem[];
	readonly x: number;
	readonly y: number;
	readonly cancelLabel: string;
}

export interface NativeMenuBridge {
	isAvailable(): boolean;
	show(request: NativeMenuRequest): Promise<string | null>;
}

export class NativeMenu {
	static bridge: NativeMenuBridge = nativeMenuBridge;

	static items(entries: readonly ContextMenuEntry[]): NativeMenuItem[] {
		return entries.flatMap((entry): NativeMenuItem[] => {
			const separator: NativeMenuItem[] =
				entry.separatorBefore === true
					? [{ key: `${entry.key}-separator`, label: "", kind: "separator" }]
					: [];
			if (entry.kind === "submenu") {
				return [
					...separator,
					{
						key: entry.key,
						label: entry.label,
						kind: "submenu",
						children: NativeMenu.items(entry.entries),
					},
				];
			}
			if (entry.kind === "panel") {
				return [...separator, { key: entry.key, label: entry.label, kind: "action" }];
			}
			return [
				...separator,
				{
					key: entry.key,
					label: entry.label,
					kind: "action",
					disabled: entry.disabled === true,
					destructive: entry.danger === true,
					checked: entry.checked === true,
				},
			];
		});
	}

	static find(entries: readonly ContextMenuEntry[], key: string): ContextMenuEntry | null {
		for (const entry of entries) {
			if (entry.key === key) {
				return entry;
			}
			if (entry.kind === "submenu") {
				const nested = NativeMenu.find(entry.entries, key);
				if (nested !== null) {
					return nested;
				}
			}
		}
		return null;
	}
}
