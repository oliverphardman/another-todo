import { useI18n } from "../i18n/i18n-context";
import { useContainer } from "./container-context";
import { useConfirmDeletion } from "./use-confirm-deletion";

export function useDeleteList(): (listId: string) => Promise<void> {
	const { store } = useContainer();
	const { t } = useI18n();
	const confirm = useConfirmDeletion();
	return async (listId) => {
		const list = store.get().lists.find((entry) => entry.id === listId);
		if (list === undefined) {
			return;
		}
		const named = { title: list.name };
		const confirmed = await confirm(
			list.owned
				? {
						title: t("dialog.deleteListTitle", named),
						body: t("dialog.deleteBody"),
						confirmLabel: t("dialog.deleteListConfirm"),
					}
				: {
						title: t("dialog.leaveListTitle", named),
						body: t("dialog.leaveListBody"),
						confirmLabel: t("dialog.leaveListConfirm"),
					},
		);
		if (confirmed) {
			store.deleteList(listId);
		}
	};
}
