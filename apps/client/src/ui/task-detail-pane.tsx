import { useI18n } from "../i18n/i18n-context";
import { useEffect, useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { DueDay } from "../domain/due-day";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { AttachmentRow } from "./attachment-row";
import { useConfirm } from "./confirm";
import { useContainer } from "./container-context";
import { ActionRow, DETAIL_ROW_HEIGHT, DetailCard, DetailSeparator } from "./detail-card";
import { DueDatePicker } from "./due-date-picker";
import { ReminderPicker } from "./reminder-picker";
import { RepeatPicker } from "./repeat-picker";
import { CheckedCircle, Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useObservable } from "./hooks";
import { useDeleteTasks } from "./use-delete-tasks";
import { Hint } from "./hint";
import { TaskNoteField, TaskTitleField } from "./task-fields";
import { AddStepRow, StepRow } from "./step-list";
import { useKeyboardShown } from "./keyboard-safe";
import { insetPadding, useInsets } from "./safe-area";
import { StatusBarTone } from "./status-bar-tone";
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
	const insets = useInsets();
	const i18n = useI18n();
	const { t } = i18n;
	const keyboardShown = useKeyboardShown();
	const [picking, setPicking] = useState(false);
	const [pickingReminder, setPickingReminder] = useState(false);
	const [pickingRepeat, setPickingRepeat] = useState(false);
	useEffect(() => {
		setPicking(false);
		setPickingReminder(false);
		setPickingRepeat(false);
	}, [task.id, task.title]);
	useEffect(() => {
		void attachments.show(task.id);
	}, [attachments, task.id]);
	const today = store.today;
	const reminder =
		task.remindAt !== null && Date.parse(task.remindAt) > store.now.getTime()
			? task.remindAt
			: null;
	const inMyDay = store.isInMyDay(task);
	const overdue = task.dueDay !== null && DueDay.isOverdue(task.dueDay, today) && !task.completed;
	const dueLabel =
		task.dueDay === null
			? t("detail.addDue")
			: t("detail.due", { when: i18n.dueLabel(task.dueDay, today) });
	return (
		<View
			style={[{ flex: 1, backgroundColor: palette.detail }, insetPadding(insets)]}
			accessibilityLabel={t("task.details")}
		>
			<StatusBarTone foreground={palette.text} />
			<ScrollView
				keyboardShouldPersistTaps="handled"
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
						<TaskTitleField key={task.id} task={task} />
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
					<ActionRow
						glyph="repeat"
						label={task.repeat === null ? t("detail.repeat") : i18n.repeatLabel(task.repeat)}
						active={task.repeat !== null}
						onPress={() => setPickingRepeat((value) => !value)}
					/>
					{pickingRepeat ? (
						<RepeatPicker
							repeat={task.repeat}
							day={task.dueDay ?? today}
							onChange={(repeat) => store.setRepeat(task.id, repeat)}
							onDone={() => setPickingRepeat(false)}
						/>
					) : null}
				</DetailCard>
				<DetailCard>
					{files.items.map((file) => (
						<AttachmentRow
							key={file.id}
							file={file}
							onOpen={() => void Linking.openURL(file.url)}
							onRemove={async () => {
								const confirmed = await confirm({
									title: t("attachment.removeTitle", { name: file.name }),
									body: t("attachment.removeBody"),
									confirmLabel: t("attachment.removeConfirm"),
								});
								if (confirmed) {
									void attachments.remove(file.id);
								}
							}}
						/>
					))}
					<ActionRow
						glyph="paperclip"
						label={t("detail.file")}
						onPress={() => void attachments.add()}
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
					<TaskNoteField key={task.id} task={task} />
				</DetailCard>
			</ScrollView>
			{keyboardShown ? null : (
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
					<Hint text={i18n.exactTime(task.createdAt)}>
						<AppText size={13} tone="secondary">
							{i18n.createdLabel(task.createdAt, store.now)}
						</AppText>
					</Hint>
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
			)}
		</View>
	);
}
