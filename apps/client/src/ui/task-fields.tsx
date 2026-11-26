import { useState } from "react";
import type { Task } from "../domain/task";
import { useI18n } from "../i18n/i18n-context";
import { useContainer } from "./container-context";
import { TextField } from "./text-field";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";
import { useDraft } from "./use-draft";

export function TaskTitleField({ task }: { task: Task }) {
	const { store } = useContainer();
	const { t } = useI18n();
	const palette = useTheme();
	const draft = useDraft(task.title, (title) => store.renameTask(task.id, title));
	return (
		<TextField
			accessibilityLabel={t("task.title")}
			value={draft.text}
			onChangeText={draft.change}
			onBlur={draft.commit}
			onSubmitEditing={draft.commit}
			style={
				{
					flex: 1,
					minWidth: 0,
					...fontStyle("600"),
					fontSize: 17,
					color: palette.text,
					paddingVertical: 12,
					outlineStyle: "none",
				} as object
			}
		/>
	);
}

export function TaskNoteField({ task }: { task: Task }) {
	const { store } = useContainer();
	const { t } = useI18n();
	const palette = useTheme();
	const [focused, setFocused] = useState(false);
	const draft = useDraft(task.note, (note) => store.setNote(task.id, note));
	return (
		<TextField
			multiline
			spellCheck={focused}
			onFocus={() => setFocused(true)}
			accessibilityLabel={t("detail.note")}
			placeholder={t("detail.addNote")}
			placeholderTextColor={palette.textSecondary}
			value={draft.text}
			onChangeText={draft.change}
			onBlur={() => {
				setFocused(false);
				draft.commit();
			}}
			style={
				{
					minHeight: 72,
					padding: 16,
					...fontStyle(),
					fontSize: 14,
					color: palette.text,
					outlineStyle: "none",
					textAlignVertical: "top",
				} as object
			}
		/>
	);
}
