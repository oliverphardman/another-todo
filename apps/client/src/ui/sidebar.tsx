import { useI18n } from "../i18n/i18n-context";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import type { IconName, TaskView } from "../domain/task-view";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon, type IconGlyph } from "./icon";
import { NewListField, SIDEBAR_ROW_HEIGHT } from "./new-list-field";
import { useContextMenuTrigger, type ContextMenuEntry } from "./context-menu";
import { Pointer } from "./pointer";
import { PressableSurface } from "./pressable-surface";
import { usePrintList } from "./use-print-list";
import { useTheme } from "./theme-context";

const DRAG_THRESHOLD = 5;

const GLYPHS: Record<IconName, IconGlyph> = {
	myDay: "sun",
	important: "star",
	planned: "calendar",
	all: "all",
	tasks: "home",
	list: "list",
};

export interface SidebarProps {
	readonly onSelected: () => void;
}

export function Sidebar({ onSelected }: SidebarProps) {
	const { store, auth } = useContainer();
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const state = useObservable(store);
	const [creating, setCreating] = useState(false);
	const print = usePrintList();
	const custom = store.orderedLists();
	const [drag, setDrag] = useState<{ id: string; index: number } | null>(null);
	const dragged = useRef(false);
	const beginDrag = (listId: string, event: unknown) => {
		const startY = Pointer.position(event).y;
		let moved = false;
		const indexAt = (y: number): number => {
			const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-list-row]")).filter(
				(row) => row.dataset.listRow !== listId,
			);
			return rows.filter((row) => {
				const box = row.getBoundingClientRect();
				return y > box.top + box.height / 2;
			}).length;
		};
		const move = (event: unknown) => {
			const y = Pointer.position(event).y;
			moved = moved || Math.abs(y - startY) > DRAG_THRESHOLD;
			if (moved) {
				setDrag({ id: listId, index: indexAt(y) });
			}
		};
		const end = (event: unknown) => {
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseup", end);
			setDrag(null);
			if (moved) {
				dragged.current = true;
				store.moveList(listId, indexAt(Pointer.position(event).y));
			}
		};
		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", end);
	};
	const markerFor = (viewId: string): "before" | "after" | null => {
		if (drag === null) {
			return null;
		}
		const others = custom.filter((list) => list.id !== drag.id);
		if (others[drag.index]?.id === viewId) {
			return "before";
		}
		return drag.index >= others.length && others[others.length - 1]?.id === viewId ? "after" : null;
	};
	const listEntries = (viewId: string): ContextMenuEntry[] => [
		{
			kind: "action",
			key: "rename",
			glyph: "edit",
			label: t("ctx.renameList"),
			onPress: () => {
				store.startRenaming(viewId);
				onSelected();
			},
		},
		{
			kind: "action",
			key: "move-up",
			glyph: "chevronUp",
			label: t("ctx.moveListUp"),
			disabled: custom.findIndex((list) => list.id === viewId) === 0,
			onPress: () => store.shiftList(viewId, -1),
		},
		{
			kind: "action",
			key: "move-down",
			glyph: "chevronDown",
			label: t("ctx.moveListDown"),
			disabled: custom.findIndex((list) => list.id === viewId) === custom.length - 1,
			onPress: () => store.shiftList(viewId, 1),
		},
		{
			kind: "action",
			key: "print",
			glyph: "print",
			label: t("ctx.printList"),
			onPress: () => {
				store.select(viewId);
				print();
			},
		},
		{
			kind: "action",
			key: "delete",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: t("ctx.deleteList"),
			onPress: () => store.deleteList(viewId),
		},
	];
	return (
		<View
			style={{ flex: 1, backgroundColor: palette.sidebar }}
			accessibilityLabel={t("sidebar.lists")}
		>
			<View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
				<AppText size={18} weight="600" style={{ flex: 1, color: palette.accent }}>
					{t("app.name")}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("signOut.button")}
					onPress={() => void auth.signOut()}
					hoverColor={palette.sidebarHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="signOut" color={palette.textSecondary} />
				</PressableSurface>
			</View>
			<ScrollView>
				{state.views.map((view, index) => {
					const selected = state.selectedViewId === view.id;
					const count = store.taskCount(view);
					return (
						<View key={view.id}>
							{index === state.views.findIndex((candidate) => candidate.isCustomList) ? (
								<View
									style={{
										height: 1,
										backgroundColor: palette.border,
										marginVertical: 8,
										marginHorizontal: 16,
									}}
								/>
							) : null}
							<SidebarRow
								view={view}
								selected={selected}
								count={count}
								onPress={() => {
									if (dragged.current) {
										dragged.current = false;
										return;
									}
									store.select(view.id);
									onSelected();
								}}
								marker={markerFor(view.id)}
								onDragStart={(event) => beginDrag(view.id, event)}
								buildMenu={() => listEntries(view.id)}
								hasMenu={view.isCustomList}
							/>
						</View>
					);
				})}
			</ScrollView>
			<View
				style={{
					borderTopWidth: 1,
					borderTopColor: palette.border,
					padding: 8,
				}}
			>
				{creating ? (
					<NewListField
						onSubmit={(name) => {
							store.addList(name);
							setCreating(false);
							onSelected();
						}}
						onCancel={() => setCreating(false)}
					/>
				) : (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={t("sidebar.createList")}
						onPress={() => setCreating(true)}
						hoverColor={palette.sidebarHover}
						style={{
							flexDirection: "row",
							alignItems: "center",
							minHeight: SIDEBAR_ROW_HEIGHT,
							paddingHorizontal: 10,
						}}
					>
						<Icon glyph="plus" color={palette.accent} />
						<AppText style={{ marginLeft: 14 }}>{t("sidebar.newList")}</AppText>
					</PressableSurface>
				)}
			</View>
		</View>
	);
}

interface SidebarRowProps {
	readonly view: TaskView;
	readonly selected: boolean;
	readonly count: number;
	readonly onPress: () => void;
	readonly buildMenu: () => ContextMenuEntry[];
	readonly hasMenu: boolean;
	readonly marker: "before" | "after" | null;
	readonly onDragStart: (event: unknown) => void;
}

function SidebarRow({
	view,
	selected,
	count,
	onPress,
	buildMenu,
	hasMenu,
	marker,
	onDragStart,
}: SidebarRowProps) {
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const menu = useContextMenuTrigger(t("ctx.listMenu"), buildMenu);
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={i18n.viewTitle(view)}
			accessibilityState={{ selected }}
			onPress={onPress}
			onContextMenu={hasMenu ? menu.onContextMenu : undefined}
			onLongPress={hasMenu ? menu.onLongPress : undefined}
			hoverColor={palette.sidebarHover}
			{...(hasMenu
				? ({
						onMouseDown: onDragStart,
						dataSet: { listRow: view.id, dropMarker: marker ?? "none" },
					} as object)
				: {})}
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingHorizontal: 16,
				paddingVertical: 11,
				borderTopWidth: 2,
				borderTopColor: marker === "before" ? palette.accent : "transparent",
				borderBottomWidth: 2,
				borderBottomColor: marker === "after" ? palette.accent : "transparent",
				backgroundColor: selected ? palette.sidebarSelected : undefined,
			}}
		>
			<Icon glyph={GLYPHS[view.icon]} color={palette.accent} />
			<AppText style={{ flex: 1, marginLeft: 14 }} weight={selected ? "600" : "400"}>
				{i18n.viewTitle(view)}
			</AppText>
			{count === 0 ? null : (
				<AppText size={12} tone="secondary" accessibilityLabel={t("sidebar.openCount", { count })}>
					{count}
				</AppText>
			)}
		</PressableSurface>
	);
}
