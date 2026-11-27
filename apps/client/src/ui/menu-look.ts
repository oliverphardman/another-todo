import { Platform } from "react-native";
import type { ThemeSetting } from "../domain/view-settings";
import type { MenuStyle } from "../state/app-settings";
import { SidebarColors } from "./sidebar-colors";
import type { Palette } from "./theme";

export interface MenuMetrics {
	readonly rowHeight: number;
	readonly fontSize: number;
	readonly iconSize: number;
	readonly strokeWidth: number;
	readonly searchHeight: number;
	readonly paddingStart: number;
	readonly paddingEnd: number;
	readonly labelGap: number;
	readonly indent: number;
	readonly countSize: number;
}

export interface MenuSurface {
	readonly background: string;
	readonly border: string;
	readonly hover: string;
	readonly selected: string;
	readonly selectionMarker: string | null;
	readonly count: string;
}

export interface MenuIcon {
	readonly viewId: string;
	readonly theme: ThemeSetting | null;
	readonly palette: Palette;
	readonly dark: boolean;
}

export abstract class MenuLook {
	constructor(readonly metrics: MenuMetrics) {}

	abstract surface(palette: Palette): MenuSurface;

	abstract iconColor(icon: MenuIcon): string;
}

export class CompactMenuLook extends MenuLook {
	surface(palette: Palette): MenuSurface {
		return {
			background: palette.sidebar,
			border: palette.sidebarBorder,
			hover: palette.sidebarHover,
			selected: palette.sidebarSelected,
			selectionMarker: null,
			count: palette.textSecondary,
		};
	}

	iconColor({ viewId, theme, palette, dark }: MenuIcon): string {
		return SidebarColors.icon(viewId, theme, palette.sidebar, dark);
	}
}

export class CozyMenuLook extends MenuLook {
	surface(palette: Palette): MenuSurface {
		return {
			background: palette.menu,
			border: palette.menuBorder,
			hover: palette.menuHover,
			selected: palette.menuSelected,
			selectionMarker: palette.accent,
			count: palette.text,
		};
	}

	iconColor({ palette }: MenuIcon): string {
		return palette.text;
	}
}

const TOUCH: MenuMetrics = {
	rowHeight: 44,
	fontSize: 14,
	iconSize: 20,
	strokeWidth: 1.6,
	searchHeight: 38,
	paddingStart: 16,
	paddingEnd: 16,
	labelGap: 12,
	indent: 20,
	countSize: 12,
};

const POINTER: MenuMetrics = {
	...TOUCH,
	rowHeight: 28,
	fontSize: 13,
	iconSize: 16,
	strokeWidth: 2,
	searchHeight: 28,
};

const COZY: MenuMetrics = {
	...TOUCH,
	strokeWidth: 1.4,
	paddingStart: 24,
	paddingEnd: 24,
	labelGap: 16,
	countSize: 14,
};

const COMPACT_BY_PLATFORM: Readonly<Record<string, MenuLook>> = {
	macos: new CompactMenuLook(POINTER),
	windows: new CompactMenuLook(POINTER),
};

const COMPACT_TOUCH = new CompactMenuLook(TOUCH);

const COZY_LOOK = new CozyMenuLook(COZY);

export function menuLook(style: MenuStyle, platform: string = Platform.OS): MenuLook {
	return style === "cozy" ? COZY_LOOK : (COMPACT_BY_PLATFORM[platform] ?? COMPACT_TOUCH);
}
