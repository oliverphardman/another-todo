import { useI18n } from "../i18n/i18n-context";
import { useRef, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import type { Group } from "../domain/group";
import type { CustomListView, IconName, TaskView } from "../domain/task-view";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon, type IconGlyph } from "./icon";
import { NewListField, SIDEBAR_ROW_HEIGHT } from "./new-list-field";
import { useContextMenuTrigger, type ContextMenuEntry } from "./context-menu";
import { Pointer } from "./pointer";
import { PressableSurface } from "./pressable-surface";
import { SharePanel } from "./share-panel";
import { usePrintList } from "./use-print-list";
import { FONT_FAMILY } from "./theme";
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
		const groupKey = state.lists.find((list) => list.id === listId)?.groupId ?? "";
		const startY = Pointer.position(event).y;
		let moved = false;
		const indexAt = (y: number): number => {
			const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-list-row]")).filter(
				(row) => row.dataset.listRow !== listId && row.dataset.listGroup === groupKey,
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
	const customViews = state.views.filter((view): view is CustomListView => view.isCustomList);
	const knownGroups = new Set(state.groups.map((group) => group.id));
	const ungrouped = customViews.filter(
		(view) => view.list.groupId === null || !knownGroups.has(view.list.groupId),
	);
	const builtIns = state.views.filter((view) => !view.isCustomList);
	const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
	const renderRow = (view: TaskView, indented: boolean) => (
		<SidebarRow
			key={view.id}
			view={view}
			selected={state.selectedViewId === view.id}
			count={store.taskCount(view)}
			indented={indented}
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
	);
	const markerFor = (viewId: string): "before" | "after" | null => {
		if (drag === null) {
			return null;
		}
		const groupOf = (id: string) => state.lists.find((list) => list.id === id)?.groupId ?? null;
		const others = custom.filter(
			(list) => list.id !== drag.id && list.groupId === groupOf(drag.id),
		);
		if (others[drag.index]?.id === viewId) {
			return "before";
		}
		return drag.index >= others.length && others[others.length - 1]?.id === viewId ? "after" : null;
	};
	const groupEntries = (groupId: string): ContextMenuEntry[] => [
		{
			kind: "action",
			key: "rename-group",
			glyph: "edit",
			label: t("ctx.renameGroup"),
			onPress: () => store.startRenamingGroup(groupId),
		},
		{
			kind: "action",
			key: "ungroup",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: t("ctx.ungroup"),
			onPress: () => store.deleteGroup(groupId),
		},
	];
	const groupMoves = (viewId: string): ContextMenuEntry[] => {
		const current = state.lists.find((list) => list.id === viewId)?.groupId ?? null;
		return [
			...(current === null
				? []
				: [
						{
							kind: "action" as const,
							key: "ungroup-list",
							glyph: "close" as const,
							label: t("ctx.removeFromGroup"),
							onPress: () => store.setListGroup(viewId, null),
						},
					]),
			...state.groups
				.filter((group) => group.id !== current)
				.map((group): ContextMenuEntry => ({
					kind: "action",
					key: `to-${group.id}`,
					glyph: "group",
					label: group.name,
					onPress: () => store.setListGroup(viewId, group.id),
				})),
		];
	};
	const listEntries = (viewId: string): ContextMenuEntry[] => {
		const list = state.lists.find((entry) => entry.id === viewId)!;
		const siblings = custom.filter((entry) => entry.groupId === list.groupId);
		const position = siblings.findIndex((entry) => entry.id === viewId);
		const owned = list.owned;
		const printEntry: ContextMenuEntry = {
			kind: "action",
			key: "print",
			glyph: "print",
			label: t("ctx.printList"),
			onPress: () => {
				store.select(viewId);
				print();
			},
		};
		const removeEntry: ContextMenuEntry = {
			kind: "action",
			key: "delete",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: owned ? t("ctx.deleteList") : t("ctx.leaveList"),
			onPress: () => store.deleteList(viewId),
		};
		if (!owned) {
			return [printEntry, removeEntry];
		}
		return [
			{
				kind: "action",
				key: "create-group",
				glyph: "group",
				label: t("ctx.createGroup"),
				onPress: () => store.createGroupFor(viewId, t("group.new")),
			},
			{
				kind: "submenu",
				key: "move-to-group",
				glyph: "move",
				label: t("ctx.moveToGroup"),
				entries: groupMoves(viewId),
			},
			{
				kind: "panel",
				key: "share",
				glyph: "people",
				label: t("ctx.shareList"),
				render: (close) => <SharePanel listId={viewId} onClose={close} />,
			},
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
				disabled: position === 0,
				onPress: () => store.shiftList(viewId, -1),
			},
			{
				kind: "action",
				key: "move-down",
				glyph: "chevronDown",
				label: t("ctx.moveListDown"),
				disabled: position === siblings.length - 1,
				onPress: () => store.shiftList(viewId, 1),
			},
			printEntry,
			removeEntry,
		];
	};
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
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					marginHorizontal: 12,
					marginBottom: 8,
					paddingHorizontal: 10,
					height: 36,
					borderRadius: 4,
					backgroundColor: palette.surface,
				}}
			>
				<Icon glyph="search" size={16} color={palette.textSecondary} />
				<TextInput
					accessibilityLabel={t("sidebar.search")}
					placeholder={t("sidebar.search")}
					placeholderTextColor={palette.textSecondary}
					value={state.searchQuery}
					onChangeText={(text) => store.search(text)}
					onKeyPress={(event) => {
						if (event.nativeEvent.key === "Escape") {
							store.search("");
						}
					}}
					onSubmitEditing={() => onSelected()}
					style={
						{
							flex: 1,
							marginLeft: 8,
							fontFamily: FONT_FAMILY,
							fontSize: 14,
							color: palette.text,
							outlineStyle: "none",
						} as object
					}
				/>
				{state.searchQuery === "" ? null : (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={t("sidebar.clearSearch")}
						onPress={() => store.search("")}
					>
						<Icon glyph="close" size={14} color={palette.textSecondary} />
					</PressableSurface>
				)}
			</View>
			<ScrollView>
				{builtIns.map((view) => renderRow(view, false))}
				{ungrouped.length === 0 && state.groups.length === 0 ? null : (
					<View
						style={{
							height: 1,
							backgroundColor: palette.border,
							marginVertical: 8,
							marginHorizontal: 16,
						}}
					/>
				)}
				{ungrouped.map((view) => renderRow(view, false))}
				{state.groups.map((group) => {
					const members = customViews.filter((view) => view.list.groupId === group.id);
					const open = !collapsed.has(group.id);
					return (
						<View key={group.id}>
							<GroupHeader
								group={group}
								open={open}
								count={members.length}
								renaming={state.renamingGroupId === group.id}
								onToggle={() =>
									setCollapsed((previous) => {
										const next = new Set(previous);
										if (next.has(group.id)) {
											next.delete(group.id);
										} else {
											next.add(group.id);
										}
										return next;
									})
								}
								onRename={(name) => {
									store.renameGroup(group.id, name);
									store.stopRenamingGroup();
								}}
								buildMenu={() => groupEntries(group.id)}
							/>
							{open ? members.map((view) => renderRow(view, true)) : null}
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
	readonly indented: boolean;
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
	indented,
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
				paddingLeft: indented ? 36 : 16,
				paddingRight: 16,
				paddingVertical: 11,
				borderTopWidth: 2,
				borderTopColor: marker === "before" ? palette.accent : "transparent",
				borderBottomWidth: 2,
				borderBottomColor: marker === "after" ? palette.accent : "transparent",
				backgroundColor: selected ? palette.sidebarSelected : undefined,
			}}
		>
			<Icon
				glyph={
					view.isCustomList && (view as CustomListView).list.shared ? "people" : GLYPHS[view.icon]
				}
				color={palette.accent}
			/>
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

interface GroupHeaderProps {
	readonly group: Group;
	readonly open: boolean;
	readonly count: number;
	readonly renaming: boolean;
	readonly onToggle: () => void;
	readonly onRename: (name: string) => void;
	readonly buildMenu: () => ContextMenuEntry[];
}

function GroupHeader({
	group,
	open,
	count,
	renaming,
	onToggle,
	onRename,
	buildMenu,
}: GroupHeaderProps) {
	const { t } = useI18n();
	const palette = useTheme();
	const menu = useContextMenuTrigger(t("group.menu"), buildMenu);
	const [text, setText] = useState(group.name);
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={t("group.header", { name: group.name })}
			aria-expanded={open}
			onPress={renaming ? undefined : onToggle}
			onContextMenu={menu.onContextMenu}
			onLongPress={menu.onLongPress}
			hoverColor={palette.sidebarHover}
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingHorizontal: 16,
				paddingVertical: 11,
			}}
		>
			<Icon glyph={open ? "chevronDown" : "chevronRight"} size={16} color={palette.textSecondary} />
			<View style={{ marginLeft: 10 }}>
				<Icon glyph="group" color={palette.accent} />
			</View>
			{renaming ? (
				<TextInput
					accessibilityLabel={t("group.name")}
					autoFocus
					selectTextOnFocus
					value={text}
					onChangeText={setText}
					onBlur={() => onRename(text)}
					onSubmitEditing={() => onRename(text)}
					style={
						{
							flex: 1,
							marginLeft: 14,
							fontFamily: FONT_FAMILY,
							fontSize: 14,
							color: palette.text,
							outlineStyle: "none",
						} as object
					}
				/>
			) : (
				<AppText style={{ flex: 1, marginLeft: 14 }} weight="600">
					{group.name}
				</AppText>
			)}
			{renaming || count === 0 ? null : (
				<AppText size={12} tone="secondary">
					{count}
				</AppText>
			)}
		</PressableSurface>
	);
}
