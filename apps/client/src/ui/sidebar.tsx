import { useI18n } from "../i18n/i18n-context";
import { useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { TextField } from "./text-field";
import type { Group } from "../domain/group";
import type { CustomListView, IconName, TaskView } from "../domain/task-view";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon, type IconGlyph } from "./icon";
import { AccountHeader } from "./account-header";
import { NewListField } from "./new-list-field";
import { SidebarColors } from "./sidebar-colors";
import { sidebarMetrics } from "./sidebar-metrics";
import { useSettingsController } from "./settings-host";
import { useTouchReorder } from "./use-touch-reorder";
import { useContextMenuTrigger, type ContextMenuEntry } from "./context-menu";
import { Pointer } from "./pointer";
import { PressableSurface } from "./pressable-surface";
import { buildListContextMenu } from "./list-context-menu";
import { usePrintList } from "./use-print-list";
import { fontStyle } from "./typeface";
import { insetPadding, useInsets } from "./safe-area";
import { StatusBarTone } from "./status-bar-tone";
import { useIsDark, useTheme } from "./theme-context";

const DRAG_THRESHOLD = 5;

const GLYPHS: Record<IconName, IconGlyph> = {
	myDay: "sun",
	important: "star",
	planned: "calendar",
	all: "infinity",
	completed: "check",
	tasks: "homeCheck",
	list: "list",
};

export interface SidebarProps {
	readonly onSelected: () => void;
}

export function Sidebar({ onSelected }: SidebarProps) {
	const { store, microsoft } = useContainer();
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const insets = useInsets();
	const state = useObservable(store);
	const [creating, setCreating] = useState(false);
	const dark = useIsDark();
	const metrics = sidebarMetrics();
	const print = usePrintList();
	const microsoftStatus = useObservable(microsoft);
	const blankMenu = useContextMenuTrigger(t("ctx.sidebarMenu"), () => {
		const entries: ContextMenuEntry[] = [
			{
				kind: "action",
				key: "create-group",
				glyph: "group",
				label: t("ctx.createGroup"),
				onPress: () => store.newGroup(t("group.new")),
			},
		];
		if (microsoftStatus === "idle") {
			entries.push({
				kind: "action",
				key: "microsoft-connect",
				separatorBefore: true,
				glyph: "sync",
				label: t("ctx.msConnect"),
				onPress: () => void microsoft.accept(),
			});
		} else if (microsoftStatus !== "unavailable" && microsoftStatus !== "offered") {
			entries.push({
				kind: "action",
				key: "microsoft-disconnect",
				separatorBefore: true,
				glyph: "sync",
				label: t("ctx.msDisconnect"),
				onPress: () => void microsoft.disconnect(),
			});
		}
		return entries;
	});
	const custom = store.orderedLists();
	const [pointerDrag, setDrag] = useState<{ id: string; index: number } | null>(null);
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
	const groupOf = (id: string) => state.lists.find((list) => list.id === id)?.groupId ?? null;
	const siblingsOf = (listId: string) =>
		custom.filter((list) => list.id !== listId && list.groupId === groupOf(listId));
	const touch = useTouchReorder({
		siblingsOf: (listId) => siblingsOf(listId).map((list) => list.id),
		onDrop: (listId, index) => store.moveList(listId, index),
	});
	const drag = touch.drag ?? pointerDrag;
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
			iconColor={SidebarColors.icon(
				view.id,
				store.settingsFor(view.id).theme,
				palette.sidebar,
				dark,
			)}
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
			reorder={
				touch.enabled && view.isCustomList
					? {
							ref: touch.register(view.id),
							lifted: touch.lifted === view.id,
							offset: touch.drag?.id === view.id ? touch.drag.offset : 0,
							lift: () => touch.lift(view.id),
							release: () => touch.release(view.id),
						}
					: null
			}
			buildMenu={() => listEntries(view.id)}
			hasMenu={view.isCustomList}
		/>
	);
	const markerFor = (viewId: string): "before" | "after" | null => {
		if (drag === null) {
			return null;
		}
		const others = siblingsOf(drag.id);
		if (others[drag.index]?.id === viewId) {
			return "before";
		}
		return drag.index >= others.length && others[others.length - 1]?.id === viewId ? "after" : null;
	};
	const groupEntries = (groupId: string): ContextMenuEntry[] => [
		{
			kind: "action",
			key: "rename-group",
			glyph: "rename",
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
	const listEntries = (viewId: string): ContextMenuEntry[] =>
		buildListContextMenu({
			store,
			i18n,
			listId: viewId,
			print,
			onRename: () => {
				store.startRenaming(viewId);
				onSelected();
			},
		});
	return (
		<View
			style={[{ flex: 1, backgroundColor: palette.sidebar }, insetPadding(insets)]}
			accessibilityLabel={t("sidebar.lists")}
		>
			<StatusBarTone foreground={palette.text} />
			<AccountHeader>{metrics.headerAction === null ? null : <SettingsButton />}</AccountHeader>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					margin: 12,
					paddingHorizontal: 12,
					height: metrics.searchHeight,
					borderRadius: metrics.searchHeight / 2,
					borderWidth: 1,
					borderColor: palette.border,
					backgroundColor: palette.sidebarField,
				}}
			>
				<Icon glyph="search" size={16} color={palette.textSecondary} />
				<TextField
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
							...fontStyle(),
							fontSize: metrics.fontSize,
							color: palette.text,
							padding: 0,
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
			<ScrollView
				keyboardShouldPersistTaps="handled"
				scrollEnabled={touch.lifted === null}
				contentContainerStyle={{ flexGrow: 1 }}
			>
				<View style={{ flexGrow: 1 }} {...touch.panHandlers}>
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
					<PressableSurface
						accessibilityLabel={t("sidebar.blank")}
						onContextMenu={blankMenu.onContextMenu}
						onLongPress={blankMenu.onLongPress}
						style={{ flexGrow: 1, minHeight: 24 }}
					/>
				</View>
			</ScrollView>
			<View style={{ paddingHorizontal: 6, paddingVertical: 8 }}>
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
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("sidebar.createList")}
							onPress={() => setCreating(true)}
							hoverColor={palette.sidebarHover}
							android_ripple={{ color: palette.ripple, foreground: true }}
							style={{
								flex: 1,
								flexDirection: "row",
								alignItems: "center",
								minHeight: metrics.rowHeight,
								paddingHorizontal: 10,
							}}
						>
							<Icon glyph="plus" size={metrics.iconSize} color={palette.text} />
							<AppText size={metrics.fontSize} style={{ marginLeft: 12 }}>
								{t("sidebar.newList")}
							</AppText>
						</PressableSurface>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("sidebar.createGroup")}
							onPress={() => store.newGroup(t("group.new"))}
							hoverColor={palette.sidebarHover}
							android_ripple={{ color: palette.ripple, foreground: true }}
							style={{
								minHeight: metrics.rowHeight,
								minWidth: metrics.rowHeight,
								alignItems: "center",
								justifyContent: "center",
								borderRadius: 4,
							}}
						>
							<Icon glyph="newGroup" size={metrics.iconSize} color={palette.text} />
						</PressableSurface>
					</View>
				)}
			</View>
		</View>
	);
}

function SettingsButton() {
	const { t } = useI18n();
	const palette = useTheme();
	const settings = useSettingsController();
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={t("settings.title")}
			onPress={() => settings.open()}
			hoverColor={palette.sidebarHover}
			android_ripple={{ color: palette.ripple, borderless: true }}
			style={{ padding: 8, borderRadius: 4 }}
		>
			<Icon glyph="settings" color={palette.textSecondary} />
		</PressableSurface>
	);
}

interface SidebarRowProps {
	readonly view: TaskView;
	readonly selected: boolean;
	readonly count: number;
	readonly iconColor: string;
	readonly onPress: () => void;
	readonly buildMenu: () => ContextMenuEntry[];
	readonly hasMenu: boolean;
	readonly indented: boolean;
	readonly marker: "before" | "after" | null;
	readonly onDragStart: (event: unknown) => void;
	readonly reorder: RowReorder | null;
}

interface RowReorder {
	readonly ref: (row: View | null) => void;
	readonly lifted: boolean;
	readonly offset: number;
	readonly lift: () => void;
	readonly release: () => boolean;
}

function SidebarRow({
	view,
	selected,
	count,
	iconColor,
	onPress,
	buildMenu,
	hasMenu,
	indented,
	marker,
	onDragStart,
	reorder,
}: SidebarRowProps) {
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const menu = useContextMenuTrigger(t("ctx.listMenu"), buildMenu);
	const metrics = sidebarMetrics();
	return (
		<PressableSurface
			ref={reorder?.ref}
			accessibilityRole="button"
			accessibilityLabel={i18n.viewTitle(view)}
			accessibilityState={{ selected }}
			onPress={onPress}
			onContextMenu={hasMenu ? menu.onContextMenu : undefined}
			onLongPress={reorder?.lift ?? (hasMenu ? menu.onLongPress : undefined)}
			onPressOut={(event) => {
				if (reorder?.release() === true) {
					menu.onContextMenu(event);
				}
			}}
			android_ripple={{ color: palette.ripple, foreground: true }}
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
				minHeight: metrics.rowHeight,
				borderTopWidth: 2,
				borderTopColor: marker === "before" ? palette.accent : "transparent",
				borderBottomWidth: 2,
				borderBottomColor: marker === "after" ? palette.accent : "transparent",
				backgroundColor: selected ? palette.sidebarSelected : undefined,
				...(reorder?.lifted === true
					? {
							backgroundColor: palette.sidebarHover,
							transform: [{ translateY: reorder.offset }],
							zIndex: 1,
							elevation: 4,
						}
					: {}),
			}}
		>
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
				style={{ flex: 1, marginLeft: 12 }}
				weight={selected ? "600" : "400"}
				numberOfLines={1}
			>
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
	const metrics = sidebarMetrics();
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
			android_ripple={{ color: palette.ripple, foreground: true }}
			style={{
				flexDirection: "row",
				alignItems: "center",
				paddingHorizontal: 16,
				minHeight: metrics.rowHeight,
			}}
		>
			<Icon glyph={open ? "chevronDown" : "chevronRight"} size={16} color={palette.textSecondary} />
			<View style={{ marginLeft: 10 }}>
				<Icon glyph="group" size={metrics.iconSize} color={palette.textSecondary} />
			</View>
			{renaming ? (
				<TextField
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
							...fontStyle(),
							fontSize: 14,
							color: palette.text,
							outlineStyle: "none",
						} as object
					}
				/>
			) : (
				<AppText size={metrics.fontSize} style={{ flex: 1, marginLeft: 12 }} weight="600">
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
