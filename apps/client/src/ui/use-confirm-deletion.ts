import { useConfirm, type ConfirmRequest } from "./confirm";
import { useContainer } from "./container-context";

export function useConfirmDeletion(): (request: ConfirmRequest) => Promise<boolean> {
	const { settings } = useContainer();
	const confirm = useConfirm();
	return async (request) => !settings.get().confirmDelete || confirm(request);
}
