import { useI18n } from "../i18n/i18n-context";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { TextField } from "./text-field";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AddTaskBar } from "./add-task-bar";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useDeleteTasks } from "./use-delete-tasks";
import { SortChip } from "./sort-chip";
import { StatusBarTone } from "./status-bar-tone";
import { SyncBanner } from "./sync-banner";
import { useContextMenuTrigger } from "./context-menu";
import { buildListOptions } from "./list-options";
import { ListMenu, type ListPanel } from "./list-menu";
import { NativeMenu } from "./native-menu";
import { usePrintList } from "./use-print-list";
import { PaneBackground } from "./pane-background";
import { Pointer } from "./pointer";
import { buildTaskMenu } from "./task-menu";
import { SyncIndicator } from "./sync-indicator";
import { useListTheme } from "./use-list-theme";
import type { LayoutMode } from "./theme";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";
import { TaskRow } from "./task-row";
import { TaskSubtitleParts } from "./task-subtitle";
import { rowMetrics } from "./row-metrics";
import type { RowStyle } from "../state/app-settings";
import { MovingList, type MovingItem } from "./list-motion";
import { useRowWindow } from "./row-window";

export interface TaskListPaneProps {
	readonly mode: LayoutMode;
	readonly onShowSidebar?: () => void;
}

const DRAG_THRESHOLD = 5;

export function TaskListPane({ mode, onShowSidebar }: TaskListPaneProps) {
	const { store, settings, motion } = useContainer();
	const { rowStyle, addTaskPosition } = useObservable(settings);
	const deleteTasks = useDeleteTasks();
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const state = useObservable(store);
	const metrics = rowMetrics(rowStyle);
	const [showDone, setShowDone] = useState(true);
	const [showYesterday, setShowYesterday] = useState(true);
	const [panel, setPanel] = useState<ListPanel | null>(null);
	const { image } = useListTheme();
	const view = store.selectedView;
	const print = usePrintList();
	const options = useContextMenuTrigger(t("list.options"), () =>
		buildListOptions({ store, i18n, view, print }),
	);
	useEffect(() => {
		setPanel(null);
	}, [view.id]);
	const { open, yesterday, done } = store.visibleTasks();
	const today = store.today;
	const manualOrder = store.settingsFor(view.id).sort === null && view.order === "newest";
	const [drag, setDrag] = useState<{ id: string; index: number } | null>(null);
	const dragged = useRef(false);
	const beginDrag = (taskId: string, event: unknown) => {
		const startY = Pointer.position(event).y;
		let moved = false;
		const indexAt = (y: number): number =>
			Array.from(document.querySelectorAll<HTMLElement>("[data-task-row]"))
				.filter((element) => element.dataset.taskRow !== taskId)
				.filter((element) => {
					const box = element.getBoundingClientRect();
					return y > box.top + box.height / 2;
				}).length;
		const move = (moving: unknown) => {
			const y = Pointer.position(moving).y;
			moved = moved || Math.abs(y - startY) > DRAG_THRESHOLD;
			if (moved) {
				setDrag({ id: taskId, index: indexAt(y) });
			}
		};
		const end = (ending: unknown) => {
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseup", end);
			setDrag(null);
			if (moved) {
				dragged.current = true;
				store.reorderTask(taskId, indexAt(Pointer.position(ending).y));
			}
		};
		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", end);
	};
	const markerFor = (taskId: string): "before" | "after" | null => {
		if (drag === null) {
			return null;
		}
		const others = open.filter((task) => task.id !== drag.id);
		if (others[drag.index]?.id === taskId) {
			return "before";
		}
		return drag.index >= others.length && others[others.length - 1]?.id === taskId ? "after" : null;
	};
	const compact = mode === "compact";
	const completedIds = state.tasks.filter((task) => task.completed).map((task) => task.id);
	const moved = useRef({ trigger: "", ids: new Set<string>(), completed: completedIds });
	const trigger = completedIds.join(" ");
	const known = useRef(new Set<string>());
	if (moved.current.trigger !== trigger) {
		const before = new Set(moved.current.completed);
		const after = new Set(completedIds);
		moved.current = {
			trigger,
			completed: completedIds,
			ids: new Set(
				[
					...completedIds.filter((id) => !before.has(id)),
					...[...before].filter((id) => !after.has(id)),
				].filter((id) => known.current.has(id)),
			),
		};
	}
	known.current = new Set(state.tasks.map((task) => task.id));
	const row = (task: Task) => (
		<TaskRow
			rowStyle={rowStyle}
			marker={markerFor(task.id)}
			onDragStart={
				manualOrder && open.includes(task) && !task.completed
					? (event) => beginDrag(task.id, event)
					: null
			}
			task={task}
			subtitle={TaskSubtitleParts.of(task, view, store, i18n)}
			overdue={task.dueDay !== null && DueDay.isOverdue(task.dueDay, today)}
			selected={state.selectedTaskIds.includes(task.id)}
			onToggleCompleted={() => store.toggleCompleted(task.id)}
			onToggleImportant={() => store.toggleImportant(task.id)}
			onSelect={(event) => {
				if (dragged.current) {
					dragged.current = false;
					return;
				}
				const { shift, toggle } = Pointer.modifiers(event);
				if (shift) {
					store.selectTaskRange(task.id);
				} else if (toggle) {
					store.toggleTaskSelection(task.id);
				} else {
					store.selectTask(task.id);
				}
			}}
			buildMenu={() => {
				const inSelection = state.selectedTaskIds.includes(task.id);
				if (!inSelection && !compact) {
					store.selectTask(task.id);
				}
				return buildTaskMenu(
					store,
					i18n,
					inSelection ? state.selectedTaskIds : [task.id],
					deleteTasks,
				);
			}}
		/>
	);
	const rows = (tasks: readonly Task[]): MovingItem[] =>
		tasks.map((task) => ({
			key: task.id,
			kind: "task",
			estimatedHeight: metrics.pitch,
			render: () => row(task),
		}));
	const section = (
		key: string,
		title: string,
		expanded: boolean,
		toggleLabel: string,
		onToggle: () => void,
		tasks: readonly Task[],
	): MovingItem[] =>
		tasks.length === 0
			? []
			: [
					{
						key,
						kind: "section",
						estimatedHeight: metrics.section.height,
						render: () => (
							<SectionHeader
								rowStyle={rowStyle}
								title={title}
								toggleLabel={toggleLabel}
								expanded={expanded}
								onToggle={onToggle}
							/>
						),
					},
					...(expanded ? rows(tasks) : []),
				];
	const items: MovingItem[] = [
		...rows(open),
		...section(
			"section-yesterday",
			t("list.yesterday"),
			showYesterday,
			showYesterday ? t("list.hideYesterdaySection") : t("list.showYesterdaySection"),
			() => setShowYesterday((value) => !value),
			yesterday,
		),
		...section(
			"section-completed",
			t("list.completed", { count: done.length }),
			showDone,
			showDone ? t("list.hideCompletedSection") : t("list.showCompletedSection"),
			() => setShowDone((value) => !value),
			done,
		),
	];
	const shownRows = useRowWindow(view.id, metrics.pitch, items, moved.current.ids);
	const scroller = useRef<ScrollView>(null);
	useLayoutEffect(() => {
		scroller.current?.scrollTo({ y: 0, animated: false });
	}, [view.id]);
	const addBar = (
		<AddTaskBar
			rowStyle={rowStyle}
			placeholder={t("task.add")}
			onSubmit={(text) => store.addTask(text)}
		/>
	);
	return (
		<PaneBackground image={image}>
			<StatusBarTone foreground={palette.onAccent} />
			<SyncBanner />
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: metrics.listPadding,
					paddingTop: 16,
					paddingBottom: 23,
				}}
			>
				{compact ? (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={t("list.showLists")}
						onPress={onShowSidebar}
						style={{ padding: 8, marginRight: 8 }}
					>
						<Icon glyph="menu" color={palette.onAccent} />
					</PressableSurface>
				) : null}
				{state.renamingViewId === view.id ? (
					<RenameField
						rowStyle={rowStyle}
						initial={view.title}
						onDone={(name) => {
							store.renameList(view.id, name);
							store.stopRenaming();
						}}
					/>
				) : (
					<PressableSurface
						accessibilityRole={view.canEditList && !compact ? "button" : undefined}
						accessibilityLabel={view.canEditList && !compact ? t("list.renameHint") : undefined}
						disabled={!view.canEditList || compact}
						onPress={() => store.startRenaming(view.id)}
						style={{ flex: 1 }}
					>
						<AppText role="heading" tone="title" {...metrics.heading}>
							{i18n.viewTitle(view)}
						</AppText>
						{view.showsDate ? (
							<AppText size={13} tone="onAccent">
								{i18n.longDay(today)}
							</AppText>
						) : null}
					</PressableSurface>
				)}
				<SyncIndicator />
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("list.options")}
					accessibilityState={{ expanded: panel !== null }}
					onPress={(event) =>
						NativeMenu.bridge.isAvailable()
							? options.onContextMenu(event)
							: setPanel(panel === null ? "menu" : null)
					}
					style={{ padding: 8, marginLeft: 4 }}
				>
					<Icon glyph={compact ? "moreVertical" : "more"} color={palette.onAccent} />
				</PressableSurface>
			</View>
			<SortChip />
			<ScrollView
				ref={scroller}
				onScroll={shownRows.onScroll}
				onLayout={shownRows.onLayout}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					flexGrow: 1,
					paddingHorizontal: metrics.listPadding,
					paddingBottom: compact ? 16 : 32,
				}}
			>
				<Pressable
					accessibilityLabel={t("list.background")}
					onPress={() => store.selectTask(null)}
					style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
				/>
				{view.allowsAdding && addTaskPosition === "top" ? addBar : null}
				<MovingList
					scope={view.id}
					trigger={trigger}
					raised={moved.current.ids}
					duration={motion.travelMs}
					items={shownRows.items}
				/>
			</ScrollView>
			{view.allowsAdding && addTaskPosition === "bottom" ? (
				<View
					style={{
						paddingHorizontal: metrics.listPadding,
						paddingTop: 8,
						paddingBottom: compact ? 8 : 16,
					}}
				>
					{addBar}
				</View>
			) : null}
			{panel === null ? null : (
				<ListMenu
					panel={panel}
					compact={compact}
					onPanel={setPanel}
					onClose={() => setPanel(null)}
				/>
			)}
		</PaneBackground>
	);
}

function SectionHeader({
	rowStyle,
	title,
	toggleLabel,
	expanded,
	onToggle,
}: {
	readonly rowStyle: RowStyle;
	readonly title: string;
	readonly toggleLabel: string;
	readonly expanded: boolean;
	readonly onToggle: () => void;
}) {
	const palette = useTheme();
	const { marginTop, paddingVertical, fontSize, iconSize } = rowMetrics(rowStyle).section;
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={toggleLabel}
			onPress={onToggle}
			style={{ flexDirection: "row", alignItems: "center", marginTop, paddingVertical }}
		>
			<Icon
				glyph={expanded ? "chevronDown" : "chevronRight"}
				size={iconSize}
				color={palette.onAccent}
			/>
			<AppText size={fontSize} tone="onAccent" weight="600" style={{ marginLeft: 8 }}>
				{title}
			</AppText>
		</PressableSurface>
	);
}

function RenameField({
	rowStyle,
	initial,
	onDone,
}: {
	rowStyle: RowStyle;
	initial: string;
	onDone: (name: string) => void;
}) {
	const { size, weight } = rowMetrics(rowStyle).heading;
	const { t } = useI18n();
	const palette = useTheme();
	const [text, setText] = useState(initial);
	const finish = () => onDone(text);
	return (
		<TextField
			accessibilityLabel={t("list.name")}
			autoFocus
			selectTextOnFocus
			value={text}
			onChangeText={setText}
			onBlur={finish}
			onSubmitEditing={finish}
			style={
				{
					flex: 1,
					...fontStyle(weight),
					fontSize: size,
					color: palette.title,
					outlineStyle: "none",
				} as object
			}
		/>
	);
}
