import { useI18n } from "../i18n/i18n-context";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
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

export function TaskListPane({ mode, onShowSidebar }: TaskListPaneProps) {
	const { store } = useContainer();
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const state = useObservable(store);
	const [showDone, setShowDone] = useState(true);
	const [renaming, setRenaming] = useState<string | null>(null);
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
			selected={state.selectedTaskIds.includes(task.id)}
			onToggleCompleted={() => store.toggleCompleted(task.id)}
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
				{renaming === null ? (
					<View style={{ flex: 1 }}>
						<AppText role="heading" size={28} weight="600" tone="onAccent">
							{i18n.viewTitle(view)}
						</AppText>
						{view.showsDate ? (
							<AppText size={13} tone="onAccent">
								{i18n.longDay(today)}
							</AppText>
						) : null}
					</View>
				) : (
					<TextInput
						accessibilityLabel={t("list.name")}
						autoFocus
						value={renaming}
						onChangeText={setRenaming}
						onBlur={() => {
							store.renameList(view.id, renaming);
							setRenaming(null);
						}}
						onSubmitEditing={() => {
							store.renameList(view.id, renaming);
							setRenaming(null);
						}}
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
				)}
				{view.isCustomList ? (
					<View style={{ flexDirection: "row" }}>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("list.rename")}
							onPress={() => setRenaming(view.title)}
							style={{ padding: 8 }}
						>
							<AppText tone="onAccent" size={13}>
								{t("list.renameShort")}
							</AppText>
						</PressableSurface>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("list.delete")}
							onPress={() => store.deleteList(view.id)}
							style={{ padding: 8 }}
						>
							<Icon glyph="trash" size={18} color={palette.onAccent} />
						</PressableSurface>
					</View>
				) : null}
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
					paddingHorizontal: 16,
					paddingBottom: compact ? 16 : 32,
				}}
			>
				{addBar}
				{open.map(row)}
				{open.length === 0 && done.length === 0 ? (
					<AppText tone="onAccent" style={{ textAlign: "center", marginTop: 32 }}>
						{t("list.empty")}
					</AppText>
				) : null}
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
