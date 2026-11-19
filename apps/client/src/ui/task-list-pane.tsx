import { useState } from "react";
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
	const state = useObservable(store);
	const [showDone, setShowDone] = useState(true);
	const [renaming, setRenaming] = useState<string | null>(null);
	const view = store.selectedView;
	const { open, done } = store.visibleTasks();
	const today = store.today;
	const subtitleFor = (task: Task): string | null => {
		const parts = [
			view.showsListName ? store.listName(task) : null,
			task.dueDay === null ? null : DueDay.label(task.dueDay, today),
		].filter((part): part is string => part !== null);
		return parts.length === 0 ? null : parts.join(" · ");
	};
	const row = (task: Task) => (
		<TaskRow
			key={task.id}
			task={task}
			subtitle={subtitleFor(task)}
			overdue={task.dueDay !== null && DueDay.isOverdue(task.dueDay, today)}
			selected={state.selectedTaskId === task.id}
			onToggleCompleted={() => store.toggleCompleted(task.id)}
			onToggleImportant={() => store.toggleImportant(task.id)}
			onSelect={() => store.selectTask(task.id)}
		/>
	);
	const addBar = <AddTaskBar placeholder="Add a task" onSubmit={(text) => store.addTask(text)} />;
	const compact = mode === "compact";
	return (
		<View style={{ flex: 1, backgroundColor: palette.background }}>
			<SyncBanner />
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingHorizontal: 16,
					paddingTop: 16,
					paddingBottom: 8,
				}}
			>
				{compact ? (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel="Show lists"
						onPress={onShowSidebar}
						style={{ padding: 8, marginRight: 8 }}
					>
						<Icon glyph="menu" color={palette.onAccent} />
					</PressableSurface>
				) : null}
				{renaming === null ? (
					<AppText role="heading" size={28} weight="600" tone="onAccent" style={{ flex: 1 }}>
						{view.title}
					</AppText>
				) : (
					<TextInput
						accessibilityLabel="List name"
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
							accessibilityLabel="Rename list"
							onPress={() => setRenaming(view.title)}
							style={{ padding: 8 }}
						>
							<AppText tone="onAccent" size={13}>
								Rename
							</AppText>
						</PressableSurface>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel="Delete list"
							onPress={() => store.deleteList(view.id)}
							style={{ padding: 8 }}
						>
							<Icon glyph="trash" size={18} color={palette.onAccent} />
						</PressableSurface>
					</View>
				) : null}
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
						No tasks here yet
					</AppText>
				) : null}
				{done.length === 0 ? null : (
					<View style={{ marginTop: 12 }}>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={showDone ? "Hide completed tasks" : "Show completed tasks"}
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
								{`Completed ${done.length}`}
							</AppText>
						</PressableSurface>
						{showDone ? done.map(row) : null}
					</View>
				)}
			</ScrollView>
		</View>
	);
}
