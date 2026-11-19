import { useI18n } from "../i18n/i18n-context";
import { useEffect, useState } from "react";
import { ScrollView, TextInput, View } from "react-native";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { ActionRow, DETAIL_ROW_HEIGHT, DetailCard, DetailSeparator } from "./detail-card";
import { DueDatePicker } from "./due-date-picker";
import { CheckedCircle, Icon } from "./icon";
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
	const i18n = useI18n();
	const { t } = i18n;
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
		task.dueDay === null
			? t("detail.addDue")
			: t("detail.due", { when: i18n.dueLabel(task.dueDay, today) });
	return (
		<View
			style={{ flex: 1, backgroundColor: palette.detail }}
			accessibilityLabel={t("task.details")}
		>
			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
			>
				<DetailCard>
					<View style={{ flexDirection: "row", alignItems: "center", minHeight: 52 }}>
						<PressableSurface
							accessibilityRole="checkbox"
							accessibilityLabel={task.completed ? t("task.uncomplete") : t("task.complete")}
							accessibilityState={{ checked: task.completed }}
							onPress={() => store.toggleCompleted(task.id)}
							style={{ padding: 14 }}
						>
							{task.completed ? (
								<CheckedCircle size={22} color={palette.accent} />
							) : (
								<Icon glyph="circle" size={22} color={palette.accent} strokeWidth={1.3} />
							)}
						</PressableSurface>
						<TextInput
							accessibilityLabel={t("task.title")}
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
							accessibilityLabel={
								task.important ? t("task.removeImportance") : t("task.makeImportant")
							}
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
						label={inMyDay ? t("detail.addedToMyDay") : t("detail.addToMyDay")}
						active={inMyDay}
						onPress={() => store.toggleMyDay(task.id)}
					/>
				</DetailCard>
				<DetailCard>
					<ActionRow glyph="bell" label={t("detail.remind")} />
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
					<ActionRow glyph="repeat" label={t("detail.repeat")} />
				</DetailCard>
				<DetailCard>
					<ActionRow glyph="tag" label={t("detail.category")} />
				</DetailCard>
				<DetailCard>
					<ActionRow glyph="paperclip" label={t("detail.file")} />
				</DetailCard>
				<DetailCard>
					<TextInput
						multiline
						accessibilityLabel={t("detail.note")}
						placeholder={t("detail.addNote")}
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
					accessibilityLabel={t("task.closeDetails")}
					onPress={onClose}
					hoverColor={palette.surfaceHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="panelClose" size={20} color={palette.textSecondary} strokeWidth={1.3} />
				</PressableSurface>
				<AppText size={13} tone="secondary">
					{i18n.createdLabel(task.createdAt, store.now)}
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("task.delete")}
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
