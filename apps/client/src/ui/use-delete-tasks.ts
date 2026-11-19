import { useI18n } from "../i18n/i18n-context";
import { useConfirm } from "./confirm";
import { useContainer } from "./container-context";

export function useDeleteTasks(): (taskIds: readonly string[]) => Promise<void> {
	const { store } = useContainer();
	const { t } = useI18n();
	const confirm = useConfirm();
	return async (taskIds) => {
		const tasks = store.get().tasks.filter((task) => taskIds.includes(task.id));
		const single = tasks.length === 1;
		const confirmed = await confirm({
			title: single
				? t("dialog.deleteTaskTitle", { title: tasks[0]!.title })
				: t("dialog.deleteTasksTitle", { count: tasks.length }),
			body: t("dialog.deleteBody"),
			confirmLabel: single ? t("dialog.deleteTaskConfirm") : t("dialog.deleteTasksConfirm"),
		});
		if (confirmed) {
			store.deleteTasks(tasks.map((task) => task.id));
		}
	};
}
