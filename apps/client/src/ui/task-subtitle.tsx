import { Fragment } from "react";
import { View } from "react-native";
import type { Task } from "../domain/task";
import type { TaskView } from "../domain/task-view";
import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import { AppText } from "./app-text";
import { Icon, type IconGlyph } from "./icon";
import { useTheme } from "./theme-context";

export interface SubtitlePart {
	readonly text: string;
	readonly glyph?: IconGlyph;
}

export class TaskSubtitleParts {
	static of(task: Task, view: TaskView, store: TodoStore, i18n: I18n): SubtitlePart[] {
		const { t } = i18n;
		const parts: (SubtitlePart | null)[] = [
			view.showsListName ? { text: store.listName(task) ?? t("view.tasks") } : null,
			view.showsMyDay && store.isInMyDay(task) ? { text: t("task.myDayTag"), glyph: "sun" } : null,
			task.steps.length === 0
				? null
				: {
						text: t("task.stepsProgress", {
							done: task.stepsCompleted,
							total: task.steps.length,
						}),
					},
			task.dueDay === null ? null : { text: i18n.dueLabel(task.dueDay, store.today) },
			task.repeat === null ? null : { text: i18n.repeatLabel(task.repeat) },
			task.hasAttachments ? { text: t("task.attachmentTag"), glyph: "paperclip" } : null,
			task.note.trim() === "" ? null : { text: t("task.noteTag"), glyph: "note" },
		];
		return parts.filter((part): part is SubtitlePart => part !== null);
	}
}

export function TaskSubtitle({
	parts,
	overdue,
}: {
	readonly parts: readonly SubtitlePart[];
	readonly overdue: boolean;
}) {
	const palette = useTheme();
	const tone = overdue ? "danger" : "secondary";
	const color = overdue ? palette.danger : palette.textSecondary;
	return (
		<View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center" }}>
			{parts.map((part, index) => (
				<Fragment key={`${part.glyph ?? "text"}-${part.text}`}>
					{index === 0 ? null : (
						<AppText size={12} tone={tone} style={{ marginHorizontal: 4 }}>
							·
						</AppText>
					)}
					<View style={{ flexDirection: "row", alignItems: "center" }}>
						{part.glyph === undefined ? null : (
							<View style={{ marginRight: 3 }}>
								<Icon glyph={part.glyph} size={12} color={color} />
							</View>
						)}
						<AppText size={12} tone={tone}>
							{part.text}
						</AppText>
					</View>
				</Fragment>
			))}
		</View>
	);
}
