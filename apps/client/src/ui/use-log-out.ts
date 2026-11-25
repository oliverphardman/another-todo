import { useI18n } from "../i18n/i18n-context";
import { useConfirm } from "./confirm";
import { useContainer } from "./container-context";

export function useLogOut(): (() => void) | null {
	const { store, auth, server, reminders } = useContainer();
	const { t } = useI18n();
	const confirm = useConfirm();
	if (server.enforced && auth.automatic) {
		return null;
	}
	const logOut = async () => {
		const confirmed =
			store.get().pendingChanges === 0 ||
			(await confirm({
				title: t("account.logOutTitle"),
				body: t("account.logOutBody"),
				confirmLabel: t("account.logOut"),
			}));
		if (!confirmed) {
			return;
		}
		await reminders.reset();
		await auth.signOut();
		if (!server.enforced) {
			await server.logOut();
		}
	};
	return () => void logOut();
}
