import { useI18n } from "../i18n/i18n-context";
import { useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { TextField } from "./text-field";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useConfirm } from "./confirm";
import { useContainer } from "./container-context";
import { ActionRow, DETAIL_ROW_HEIGHT, DetailCard, DetailSeparator } from "./detail-card";
import { DueDatePicker } from "./due-date-picker";
import { ReminderPicker } from "./reminder-picker";
import { CheckedCircle, Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useObservable } from "./hooks";
import { useDeleteTasks } from "./use-delete-tasks";
import { AddStepRow, StepRow } from "./step-list";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface TaskDetailPaneProps {
	readonly task: Task;
	readonly onClose: () => void;
}

export function TaskDetailPane({ task, onClose }: TaskDetailPaneProps) {
	const { store, attachments, reminders } = useContainer();
	const reminderState = useObservable(reminders);
	const confirm = useConfirm();
	const files = useObservable(attachments);
	const deleteTasks = useDeleteTasks();
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const [title, setTitle] = useState(task.title);
	const [note, setNote] = useState(task.note);
	const [noteFocused, setNoteFocused] = useState(false);
	const [picking, setPicking] = useState(false);
	const [pickingReminder, setPickingReminder] = useState(false);
	useEffect(() => {
		setTitle(task.title);
		setPicking(false);
		setPickingReminder(false);
	}, [task.id, task.title]);
	useEffect(() => {
		void attachments.show(task.id);
	}, [attachments, task.id]);
	useEffect(() => {
		setNote(task.note);
	}, [task.id, task.note]);
	const today = store.today;
	const reminder =
		task.remindAt !== null && Date.parse(task.remindAt) > store.now.getTime()
			? task.remindAt
			: null;
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
						<TextField
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
							onPromote={() => store.promoteStep(task.id, step.id)}
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
					<ActionRow
						glyph="bell"
						label={
							!reminderState.available
								? t("detail.remindUnavailable")
								: reminder === null
									? t("detail.remind")
									: t("detail.remindAt", { when: i18n.reminderLabel(reminder) })
						}
						active={reminder !== null}
						onPress={
							reminderState.available ? () => setPickingReminder((value) => !value) : undefined
						}
					/>
					{pickingReminder ? (
						<ReminderPicker
							at={reminder}
							now={store.now}
							onChange={(at) => {
								store.setReminder(task.id, at);
								setPickingReminder(false);
								if (at !== null) {
									void reminders.ensurePermission();
								}
							}}
						/>
					) : null}
					{reminderState.permission === "denied" && reminder !== null ? (
						<AppText
							tone="secondary"
							size={12}
							style={{ paddingHorizontal: 14, paddingBottom: 10 }}
						>
							{t("remind.blocked")}
						</AppText>
					) : null}
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
					{files.items.map((file) => (
						<View key={file.id} style={{ flexDirection: "row", alignItems: "center" }}>
							<View style={{ flex: 1, minWidth: 0 }}>
								<ActionRow
									glyph="paperclip"
									label={t("attachment.open", { name: file.name })}
									onPress={() => void Linking.openURL(file.url)}
								/>
							</View>
							<PressableSurface
								accessibilityRole="button"
								accessibilityLabel={t("attachment.remove", { name: file.name })}
								onPress={async () => {
									const confirmed = await confirm({
										title: t("attachment.removeTitle", { name: file.name }),
										body: t("attachment.removeBody"),
										confirmLabel: t("attachment.removeConfirm"),
									});
									if (confirmed) {
										void attachments.remove(file.id);
									}
								}}
								style={{ padding: 14 }}
							>
								<Icon glyph="trash" size={18} color={palette.textSecondary} />
							</PressableSurface>
						</View>
					))}
					<ActionRow
						glyph="paperclip"
						label={files.busy === "uploading" ? t("attachment.uploading") : t("detail.file")}
						onPress={files.busy === "uploading" ? undefined : () => void attachments.add()}
					/>
					{files.error === null ? null : (
						<AppText
							tone="secondary"
							size={12}
							style={{ paddingHorizontal: 14, paddingBottom: 10 }}
						>
							{i18n.text(files.error)}
						</AppText>
					)}
				</DetailCard>
				<DetailCard>
					<TextField
						multiline
						spellCheck={noteFocused}
						onFocus={() => setNoteFocused(true)}
						accessibilityLabel={t("detail.note")}
						placeholder={t("detail.addNote")}
						placeholderTextColor={palette.textSecondary}
						value={note}
						onChangeText={setNote}
						onBlur={() => {
							setNoteFocused(false);
							store.setNote(task.id, note);
						}}
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
					onPress={() => void deleteTasks([task.id])}
					hoverColor={palette.surfaceHover}
					style={{ padding: 8, borderRadius: 4 }}
				>
					<Icon glyph="trash" size={20} color={palette.textSecondary} strokeWidth={1.3} />
				</PressableSurface>
			</View>
		</View>
	);
}
