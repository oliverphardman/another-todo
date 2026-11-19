import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { DueDatePicker } from "./due-date-picker";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface TaskDetailPaneProps {
	readonly task: Task;
	readonly onClose: () => void;
}

export function TaskDetailPane({ task, onClose }: TaskDetailPaneProps) {
	const { store } = useContainer();
	const palette = useTheme();
	const state = useObservable(store);
	const [title, setTitle] = useState(task.title);
	const [picking, setPicking] = useState(false);
	useEffect(() => {
		setTitle(task.title);
		setPicking(false);
	}, [task.id, task.title]);
	const today = store.today;
	const dueLabel =
		task.dueDay === null ? "Add due date" : `Due ${DueDay.label(task.dueDay, today)}`;
	const section = {
		backgroundColor: palette.surface,
		borderRadius: 4,
		marginBottom: 8,
	} as const;
	return (
		<View style={{ flex: 1, backgroundColor: palette.detail }} accessibilityLabel="Task details">
			<View style={{ flexDirection: "row", alignItems: "center", padding: 8 }}>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Close details"
					onPress={onClose}
					hoverColor={palette.surfaceHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="back" color={palette.text} />
				</PressableSurface>
			</View>
			<ScrollView contentContainerStyle={{ padding: 12 }}>
				<View style={{ ...section, flexDirection: "row", alignItems: "center" }}>
					<PressableSurface
						accessibilityRole="checkbox"
						accessibilityLabel={task.completed ? "Mark as not completed" : "Mark as completed"}
						accessibilityState={{ checked: task.completed }}
						onPress={() => store.toggleCompleted(task.id)}
						style={{ padding: 14 }}
					>
						<Icon glyph={task.completed ? "check" : "circle"} size={22} color={palette.accent} />
					</PressableSurface>
					<TextInput
						accessibilityLabel="Task title"
						value={title}
						onChangeText={setTitle}
						onBlur={() => store.renameTask(task.id, title)}
						onSubmitEditing={() => store.renameTask(task.id, title)}
						style={
							{
								flex: 1,
								fontFamily: FONT_FAMILY,
								fontSize: 16,
								fontWeight: "600",
								color: palette.text,
								paddingVertical: 12,
								outlineStyle: "none",
							} as object
						}
					/>
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={task.important ? "Remove importance" : "Mark as important"}
						onPress={() => store.toggleImportant(task.id)}
						style={{ padding: 14 }}
					>
						<Icon glyph={task.important ? "starFilled" : "star"} size={20} color={palette.accent} />
					</PressableSurface>
				</View>
				<View style={section}>
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={dueLabel}
						onPress={() => setPicking((value) => !value)}
						hoverColor={palette.surfaceHover}
						style={{ flexDirection: "row", alignItems: "center", padding: 14 }}
					>
						<Icon glyph="calendar" color={palette.accent} />
						<AppText
							style={{ marginLeft: 12 }}
							tone={
								task.dueDay !== null && DueDay.isOverdue(task.dueDay, today) && !task.completed
									? "danger"
									: "primary"
							}
						>
							{dueLabel}
						</AppText>
					</PressableSurface>
					{picking ? (
						<DueDatePicker
							day={task.dueDay}
							today={today}
							onChange={(day) => {
								store.setDueDay(task.id, day);
								setPicking(false);
							}}
						/>
					) : null}
				</View>
				<View style={section}>
					<AppText size={12} tone="secondary" style={{ padding: 12, paddingBottom: 4 }}>
						List
					</AppText>
					{[
						{ id: null, name: "Tasks" },
						...state.lists.map((list) => ({ id: list.id, name: list.name })),
					].map((option) => (
						<PressableSurface
							key={option.id ?? "default"}
							accessibilityRole="radio"
							accessibilityLabel={`Move to ${option.name}`}
							accessibilityState={{ selected: task.listId === option.id }}
							onPress={() => store.moveTask(task.id, option.id)}
							hoverColor={palette.surfaceHover}
							style={{
								flexDirection: "row",
								alignItems: "center",
								padding: 12,
							}}
						>
							<Icon
								glyph={task.listId === option.id ? "check" : "circle"}
								size={18}
								color={palette.accent}
							/>
							<AppText style={{ marginLeft: 10 }}>{option.name}</AppText>
						</PressableSurface>
					))}
				</View>
				<AppText size={12} tone="secondary" style={{ textAlign: "center", marginVertical: 8 }}>
					{`Created ${DueDay.label(DueDay.fromIso(task.createdAt), today)}`}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Delete task"
					onPress={() => store.deleteTask(task.id)}
					hoverColor={palette.surfaceHover}
					style={{
						...section,
						flexDirection: "row",
						alignItems: "center",
						padding: 14,
						justifyContent: "center",
					}}
				>
					<Icon glyph="trash" color={palette.danger} />
					<AppText tone="danger" style={{ marginLeft: 10 }}>
						Delete task
					</AppText>
				</PressableSurface>
			</ScrollView>
		</View>
	);
}
