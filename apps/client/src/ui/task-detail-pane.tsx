import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { ActionRow, DETAIL_ROW_HEIGHT, DetailCard, DetailSeparator } from "./detail-card";
import { DueDatePicker } from "./due-date-picker";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { AddStepRow, StepRow } from "./step-list";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface TaskDetailPaneProps {
	readonly task: Task;
	readonly onClose: () => void;
}

export function TaskDetailPane({ task, onClose }: TaskDetailPaneProps) {
	const { store } = useContainer();
	const palette = useTheme();
	const [title, setTitle] = useState(task.title);
	const [note, setNote] = useState(task.note);
	const [picking, setPicking] = useState(false);
	useEffect(() => {
		setTitle(task.title);
		setPicking(false);
	}, [task.id, task.title]);
	useEffect(() => {
		setNote(task.note);
	}, [task.id, task.note]);
	const today = store.today;
	const inMyDay = task.isInMyDay(today);
	const overdue = task.dueDay !== null && DueDay.isOverdue(task.dueDay, today) && !task.completed;
	const dueLabel =
		task.dueDay === null ? "Add due date" : `Due ${DueDay.label(task.dueDay, today)}`;
	return (
		<View style={{ flex: 1, backgroundColor: palette.detail }} accessibilityLabel="Task details">
			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
			>
				<DetailCard>
					<View style={{ flexDirection: "row", alignItems: "center", minHeight: 52 }}>
						<PressableSurface
							accessibilityRole="checkbox"
							accessibilityLabel={task.completed ? "Mark as not completed" : "Mark as completed"}
							accessibilityState={{ checked: task.completed }}
							onPress={() => store.toggleCompleted(task.id)}
							style={{ padding: 14 }}
						>
							<Icon
								glyph={task.completed ? "check" : "circle"}
								size={22}
								color={palette.accent}
								strokeWidth={1.3}
							/>
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
									minWidth: 0,
									fontFamily: FONT_FAMILY,
									fontSize: 17,
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
							<Icon
								glyph={task.important ? "starFilled" : "star"}
								size={22}
								color={palette.accent}
							/>
						</PressableSurface>
					</View>
					{task.steps.map((step) => (
						<StepRow
							key={step.id}
							step={step}
							onToggle={() => store.updateStep(task.id, step.id, { completed: !step.completed })}
							onRename={(stepTitle) => store.updateStep(task.id, step.id, { title: stepTitle })}
							onDelete={() => store.deleteStep(task.id, step.id)}
						/>
					))}
					{task.steps.length === 0 ? null : <DetailSeparator />}
					<AddStepRow onAdd={(stepTitle) => store.addStep(task.id, stepTitle)} />
				</DetailCard>
				<DetailCard>
					<ActionRow
						glyph="sun"
						label={inMyDay ? "Added to My Day" : "Add to My Day"}
						active={inMyDay}
						onPress={() => store.toggleMyDay(task.id)}
					/>
				</DetailCard>
				<DetailCard>
					<ActionRow glyph="bell" label="Remind me" />
					<DetailSeparator />
					<ActionRow
						glyph="calendarDots"
						label={dueLabel}
						active={task.dueDay !== null && !overdue}
						danger={overdue}
						onPress={() => setPicking((value) => !value)}
					/>
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
					<DetailSeparator />
					<ActionRow glyph="repeat" label="Repeat" />
				</DetailCard>
				<DetailCard>
					<ActionRow glyph="tag" label="Pick a category" />
				</DetailCard>
				<DetailCard>
					<ActionRow glyph="paperclip" label="Add file" />
				</DetailCard>
				<DetailCard>
					<TextInput
						multiline
						accessibilityLabel="Note"
						placeholder="Add note"
						placeholderTextColor={palette.textSecondary}
						value={note}
						onChangeText={setNote}
						onBlur={() => store.setNote(task.id, note)}
						style={
							{
								minHeight: 72,
								padding: 16,
								fontFamily: FONT_FAMILY,
								fontSize: 14,
								color: palette.text,
								outlineStyle: "none",
								textAlignVertical: "top",
							} as object
						}
					/>
				</DetailCard>
			</ScrollView>
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					minHeight: DETAIL_ROW_HEIGHT + 8,
					marginHorizontal: 16,
					borderTopWidth: 1,
					borderTopColor: palette.border,
				}}
			>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Close details"
					onPress={onClose}
					hoverColor={palette.surfaceHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="panelClose" size={20} color={palette.textSecondary} strokeWidth={1.3} />
				</PressableSurface>
				<AppText size={13} tone="secondary">
					{`Created ${DueDay.label(DueDay.fromIso(task.createdAt), today)}`}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Delete task"
					onPress={() => store.deleteTask(task.id)}
					hoverColor={palette.surfaceHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="trash" size={20} color={palette.textSecondary} strokeWidth={1.3} />
				</PressableSurface>
			</View>
		</View>
	);
}
