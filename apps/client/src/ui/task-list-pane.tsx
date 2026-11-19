import { useI18n } from "../i18n/i18n-context";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AddTaskBar } from "./add-task-bar";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { SyncBanner } from "./sync-banner";
import { ListMenu, type ListPanel } from "./list-menu";
import { PaneBackground } from "./pane-background";
import { Pointer } from "./pointer";
import { buildTaskMenu } from "./task-menu";
import { SyncIndicator } from "./sync-indicator";
import { useListTheme } from "./use-list-theme";
import type { LayoutMode } from "./theme";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";
import { TaskRow } from "./task-row";

export interface TaskListPaneProps {
	readonly mode: LayoutMode;
	readonly onShowSidebar?: () => void;
}

const ROW_PITCH = 54;
const COMPLETED_GAP = 40;

export function TaskListPane({ mode, onShowSidebar }: TaskListPaneProps) {
	const { store } = useContainer();
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const state = useObservable(store);
	const [showDone, setShowDone] = useState(true);
	const [panel, setPanel] = useState<ListPanel | null>(null);
	const { imageUrl } = useListTheme();
	const view = store.selectedView;
	useEffect(() => {
		setPanel(null);
	}, [view.id]);
	const { open, done } = store.visibleTasks();
	const today = store.today;
	const subtitleFor = (task: Task): string | null => {
		const parts = [
			view.showsListName ? (store.listName(task) ?? t("view.tasks")) : null,
			task.steps.length === 0
				? null
				: t("task.stepsProgress", { done: task.stepsCompleted, total: task.steps.length }),
			view.showsMyDay && task.isInMyDay(today) ? t("task.myDayTag") : null,
			task.dueDay === null ? null : i18n.dueLabel(task.dueDay, today),
		].filter((part): part is string => part !== null);
		return parts.length === 0 ? null : parts.join(" · ");
	};
	const row = (task: Task) => (
		<TaskRow
			key={task.id}
			task={task}
			subtitle={subtitleFor(task)}
			overdue={task.dueDay !== null && DueDay.isOverdue(task.dueDay, today)}
			travel={Math.max(0, open.length - 1 - open.indexOf(task)) * ROW_PITCH + COMPLETED_GAP}
			selected={state.selectedTaskIds.includes(task.id)}
			onToggleCompleted={(silent) => store.toggleCompleted(task.id, !silent)}
			onCompleting={() => store.announceCompleted()}
			onToggleImportant={() => store.toggleImportant(task.id)}
			onSelect={(event) => {
				const { shift, toggle } = Pointer.modifiers(event);
				if (shift) {
					store.selectTaskRange(task.id);
				} else if (toggle) {
					store.toggleTaskSelection(task.id);
				} else {
					store.selectTask(task.id);
				}
			}}
			buildMenu={() =>
				buildTaskMenu(
					store,
					i18n,
					state.selectedTaskIds.includes(task.id) ? state.selectedTaskIds : [task.id],
				)
			}
		/>
	);
	const addBar = (
		<AddTaskBar placeholder={t("task.add")} onSubmit={(text) => store.addTask(text)} />
	);
	const compact = mode === "compact";
	return (
		<PaneBackground imageUrl={imageUrl}>
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
						accessibilityRole={view.isCustomList && !compact ? "button" : undefined}
						accessibilityLabel={view.isCustomList && !compact ? t("list.renameHint") : undefined}
						disabled={!view.isCustomList || compact}
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
					onPress={() => setPanel(panel === null ? "menu" : null)}
					style={{ padding: 8, marginLeft: 4 }}
				>
					<Icon glyph={compact ? "moreVertical" : "more"} color={palette.onAccent} />
				</PressableSurface>
			</View>
			<ScrollView
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
				{view.allowsAdding ? addBar : null}
				{open.map(row)}
				{done.length === 0 ? null : (
					<View style={{ marginTop: 12 }}>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={
								showDone ? t("list.hideCompletedSection") : t("list.showCompletedSection")
							}
							onPress={() => setShowDone((value) => !value)}
							style={{
								flexDirection: "row",
								alignItems: "center",
								paddingVertical: 8,
							}}
						>
							<Icon
								glyph={showDone ? "chevronDown" : "chevronRight"}
								size={16}
								color={palette.onAccent}
							/>
							<AppText tone="onAccent" weight="600" style={{ marginLeft: 8 }}>
								{t("list.completed", { count: done.length })}
							</AppText>
						</PressableSurface>
						{showDone ? done.map(row) : null}
					</View>
				)}
			</ScrollView>
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

function RenameField({ initial, onDone }: { initial: string; onDone: (name: string) => void }) {
	const { t } = useI18n();
	const palette = useTheme();
	const [text, setText] = useState(initial);
	const finish = () => onDone(text);
	return (
		<TextInput
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
