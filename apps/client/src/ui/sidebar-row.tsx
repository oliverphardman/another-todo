import { View } from "react-native";
import type { CustomListView, IconName, TaskView } from "../domain/task-view";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContextMenuTrigger, type ContextMenuEntry } from "./context-menu";
import { Icon, type IconGlyph } from "./icon";
import type { MenuLook } from "./menu-look";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

const GLYPHS: Record<IconName, IconGlyph> = {
	myDay: "sun",
	important: "star",
	planned: "calendar",
	all: "infinity",
	completed: "check",
	tasks: "homeCheck",
	list: "list",
};

export interface SidebarRowProps {
	readonly look: MenuLook;
	readonly view: TaskView;
	readonly selected: boolean;
	readonly count: number;
	readonly iconColor: string;
	readonly onPress: () => void;
	readonly listActions: ListActions | null;
	readonly indented: boolean;
	readonly marker: "before" | "after" | null;
	readonly reorder: RowReorder | null;
}

export interface ListActions {
	readonly buildMenu: () => ContextMenuEntry[];
	readonly onDragStart: (event: unknown) => void;
}

export interface RowReorder {
	readonly ref: (row: View | null) => void;
	readonly lifted: boolean;
	readonly offset: number;
	readonly lift: () => void;
	readonly release: () => boolean;
}

export function SidebarRow({
	look,
	view,
	selected,
	count,
	iconColor,
	onPress,
	listActions,
	indented,
	marker,
	reorder,
}: SidebarRowProps) {
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const menu = useContextMenuTrigger(t("ctx.listMenu"), () => listActions!.buildMenu());
	const { metrics } = look;
	const surface = look.surface(palette);
	return (
		<PressableSurface
			ref={reorder?.ref}
			accessibilityRole="button"
			accessibilityLabel={i18n.viewTitle(view)}
			accessibilityState={{ selected }}
			onPress={onPress}
			onContextMenu={listActions === null ? undefined : menu.onContextMenu}
			onLongPress={reorder?.lift ?? (listActions === null ? undefined : menu.onLongPress)}
			onPressOut={(event) => {
				if (reorder?.release() === true) {
					menu.onContextMenu(event);
				}
			}}
			android_ripple={{ color: palette.ripple, foreground: true }}
			hoverColor={surface.hover}
			{...(listActions !== null
				? ({
						onMouseDown: listActions.onDragStart,
						dataSet: {
							listRow: view.id,
							listGroup: (view as CustomListView).list.groupId ?? "",
							dropMarker: marker ?? "none",
						},
					} as object)
				: {})}
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingLeft: metrics.paddingStart + (indented ? metrics.indent : 0),
				paddingRight: metrics.paddingEnd,
				minHeight: metrics.rowHeight,
				borderTopWidth: 2,
				borderTopColor: marker === "before" ? palette.accent : "transparent",
				borderBottomWidth: 2,
				borderBottomColor: marker === "after" ? palette.accent : "transparent",
				backgroundColor: selected ? surface.selected : undefined,
				...(reorder?.lifted === true
					? {
							backgroundColor: surface.hover,
							transform: [{ translateY: reorder.offset }],
							zIndex: 1,
							elevation: 4,
						}
					: {}),
			}}
		>
			{selected && surface.selectionMarker !== null ? (
				<View
					testID="selection-marker"
					style={{
						position: "absolute",
						left: 0,
						top: -2,
						bottom: -2,
						width: 3,
						backgroundColor: surface.selectionMarker,
					}}
				/>
			) : null}
			<Icon
				glyph={
					view.isCustomList && (view as CustomListView).list.shared ? "people" : GLYPHS[view.icon]
				}
				size={metrics.iconSize}
				strokeWidth={metrics.strokeWidth}
				color={iconColor}
			/>
			<AppText
				size={metrics.fontSize}
				style={{ flex: 1, marginLeft: metrics.labelGap }}
				weight={selected ? "600" : "400"}
				numberOfLines={1}
			>
				{i18n.viewTitle(view)}
			</AppText>
			{count === 0 ? null : (
				<AppText
					size={metrics.countSize}
					style={{ color: surface.count }}
					accessibilityLabel={t("sidebar.openCount", { count })}
				>
					{count}
				</AppText>
			)}
		</PressableSurface>
	);
}
