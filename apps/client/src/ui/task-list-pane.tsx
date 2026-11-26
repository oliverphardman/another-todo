import { useI18n } from "../i18n/i18n-context";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";
import { TaskRow } from "./task-row";
import { rowMetrics } from "./row-metrics";

export interface TaskListPaneProps {
	readonly mode: LayoutMode;
	readonly onShowSidebar?: () => void;
}

const DRAG_THRESHOLD = 5;
const COMPLETED_GAP = 40;

export function TaskListPane({ mode, onShowSidebar }: TaskListPaneProps) {
	const { store, settings } = useContainer();
	const { rowStyle, addTaskPosition } = useObservable(settings);
	const deleteTasks = useDeleteTasks();
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const state = useObservable(store);
	const [showDone, setShowDone] = useState(true);
	const [showYesterday, setShowYesterday] = useState(true);
	const [panel, setPanel] = useState<ListPanel | null>(null);
	const { imageUrl } = useListTheme();
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
	const subtitleFor = (task: Task): string | null => {
		const parts = [
			view.showsListName ? (store.listName(task) ?? t("view.tasks")) : null,
			task.steps.length === 0
				? null
				: t("task.stepsProgress", { done: task.stepsCompleted, total: task.steps.length }),
			view.showsMyDay && store.isInMyDay(task) ? t("task.myDayTag") : null,
			task.dueDay === null ? null : i18n.dueLabel(task.dueDay, today),
			task.repeat === null ? null : i18n.repeatLabel(task.repeat),
		].filter((part): part is string => part !== null);
		return parts.length === 0 ? null : parts.join(" · ");
	};
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
	const row = (task: Task) => (
		<TaskRow
			rowStyle={rowStyle}
			marker={markerFor(task.id)}
			onDragStart={
				manualOrder && open.includes(task) && !task.completed
					? (event) => beginDrag(task.id, event)
					: null
			}
			key={task.id}
			task={task}
			subtitle={subtitleFor(task)}
			overdue={task.dueDay !== null && DueDay.isOverdue(task.dueDay, today)}
			travel={
				Math.max(0, open.length - 1 - open.indexOf(task)) * rowMetrics(rowStyle).pitch +
				COMPLETED_GAP
			}
			selected={state.selectedTaskIds.includes(task.id)}
			onToggleCompleted={(silent) => store.toggleCompleted(task.id, !silent)}
			onCompleting={() => store.announceCompleted()}
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
	const addBar = (
		<AddTaskBar placeholder={t("task.add")} onSubmit={(text) => store.addTask(text)} />
	);
	return (
		<PaneBackground imageUrl={imageUrl}>
			<StatusBarTone foreground={palette.onAccent} />
			<SyncBanner />
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: 16,
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
						<AppText role="heading" size={28} weight="600" tone="onAccent">
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
				keyboardShouldPersistTaps="handled"
				contentContainerStyle={{
					flexGrow: 1,
					paddingHorizontal: 16,
					paddingBottom: compact ? 16 : 32,
				}}
			>
				<Pressable
					accessibilityLabel={t("list.background")}
					onPress={() => store.selectTask(null)}
					style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
				/>
				{view.allowsAdding && addTaskPosition === "top" ? addBar : null}
				{open.map(row)}
				{yesterday.length === 0 ? null : (
					<TaskSection
						title={t("list.yesterday")}
						toggleLabel={
							showYesterday ? t("list.hideYesterdaySection") : t("list.showYesterdaySection")
						}
						expanded={showYesterday}
						onToggle={() => setShowYesterday((value) => !value)}
					>
						{yesterday.map(row)}
					</TaskSection>
				)}
				{done.length === 0 ? null : (
					<TaskSection
						title={t("list.completed", { count: done.length })}
						toggleLabel={showDone ? t("list.hideCompletedSection") : t("list.showCompletedSection")}
						expanded={showDone}
						onToggle={() => setShowDone((value) => !value)}
					>
						{done.map(row)}
					</TaskSection>
				)}
			</ScrollView>
			{view.allowsAdding && addTaskPosition === "bottom" ? (
				<View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: compact ? 8 : 16 }}>
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

function TaskSection({
	title,
	toggleLabel,
	expanded,
	onToggle,
	children,
}: {
	readonly title: string;
	readonly toggleLabel: string;
	readonly expanded: boolean;
	readonly onToggle: () => void;
	readonly children: ReactNode;
}) {
	const palette = useTheme();
	return (
		<View style={{ marginTop: 12 }}>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={toggleLabel}
				onPress={onToggle}
				style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}
			>
				<Icon
					glyph={expanded ? "chevronDown" : "chevronRight"}
					size={16}
					color={palette.onAccent}
				/>
				<AppText tone="onAccent" weight="600" style={{ marginLeft: 8 }}>
					{title}
				</AppText>
			</PressableSurface>
			{expanded ? children : null}
		</View>
	);
}

function RenameField({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
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
					fontFamily: FONT_FAMILY,
					fontSize: 28,
					fontWeight: "600",
					color: palette.onAccent,
					outlineStyle: "none",
				} as object
			}
		/>
	);
}
