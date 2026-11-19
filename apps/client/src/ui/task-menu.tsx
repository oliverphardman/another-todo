import { DueDay } from "../domain/due-day";
import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import type { ContextMenuEntry } from "./context-menu";
import { DueDatePicker } from "./due-date-picker";

export function buildTaskMenu(
	store: TodoStore,
	i18n: I18n,
	taskIds: readonly string[],
	deleteTasks: (taskIds: readonly string[]) => void,
): ContextMenuEntry[] {
	const { t } = i18n;
	const today = store.today;
	const tasks = store.get().tasks.filter((task) => taskIds.includes(task.id));
	const inMyDay = tasks.every((task) => task.isInMyDay(today));
	const important = tasks.every((task) => task.important);
	const completed = tasks.every((task) => task.completed);
	const sharedDue = tasks.every((task) => task.dueDay === tasks[0]!.dueDay)
		? tasks[0]!.dueDay
		: null;
	const ownedLists = store.get().lists.filter((list) => list.owned);
	const inSharedList = tasks.some(
		(task) => task.listId !== null && !ownedLists.some((list) => list.id === task.listId),
	);
	const moveEntries: ContextMenuEntry[] = inSharedList
		? []
		: [
				{
					kind: "action",
					key: "new-list",
					separatorBefore: true,
					glyph: "list",
					label: t("ctx.createList"),
					disabled: taskIds.length !== 1,
					onPress: () => store.createListFromTask(taskIds[0]!),
				},
				{
					kind: "submenu",
					key: "move",
					glyph: "move",
					label: t("ctx.moveTo"),
					entries: [
						{
							kind: "action",
							key: "move-default",
							glyph: "home",
							label: t("view.tasks"),
							onPress: () => store.moveTasks(taskIds, null),
						},
						...ownedLists.map((list): ContextMenuEntry => ({
							kind: "action",
							key: `move-${list.id}`,
							glyph: "list",
							label: list.name,
							onPress: () => store.moveTasks(taskIds, list.id),
						})),
					],
				},
			];
	return [
		{
			kind: "action",
			key: "my-day",
			glyph: "sun",
			label: inMyDay ? t("ctx.removeFromMyDay") : t("ctx.addToMyDay"),
			onPress: () => store.setInMyDay(taskIds, !inMyDay),
		},
		{
			kind: "action",
			key: "important",
			glyph: important ? "starFilled" : "star",
			label: important ? t("ctx.removeImportance") : t("ctx.markImportant"),
			onPress: () => store.setImportant(taskIds, !important),
		},
		{
			kind: "action",
			key: "completed",
			glyph: "check",
			label: completed ? t("ctx.markNotCompleted") : t("ctx.markCompleted"),
			onPress: () => store.completeTasks(taskIds, !completed),
		},
		{
			kind: "action",
			key: "due-today",
			separatorBefore: true,
			glyph: "calendar",
			label: t("ctx.dueToday"),
			onPress: () => store.setDueDayFor(taskIds, today),
		},
		{
			kind: "action",
			key: "due-tomorrow",
			glyph: "calendar",
			label: t("ctx.dueTomorrow"),
			onPress: () => store.setDueDayFor(taskIds, DueDay.add(today, 1)),
		},
		{
			kind: "panel",
			key: "pick-date",
			glyph: "calendarPlus",
			label: t("ctx.pickDate"),
			render: (close) => (
				<DueDatePicker
					day={sharedDue}
					today={today}
					onChange={(day) => {
						store.setDueDayFor(taskIds, day);
						close();
					}}
				/>
			),
		},
		...moveEntries,
		{
			kind: "action",
			key: "delete",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: t("ctx.deleteTask"),
			onPress: () => deleteTasks(taskIds),
		},
	];
}
