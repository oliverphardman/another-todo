import { useI18n } from "../i18n/i18n-context";
import { ListPrintDocument } from "../print/list-print-document";
import { useContainer } from "./container-context";

export function usePrintList(): () => void {
	const { store, printer } = useContainer();
	const i18n = useI18n();
	return () => {
		const view = store.selectedView;
		const { open, done } = store.visibleTasks();
		const html = ListPrintDocument.html(
			{
				title: i18n.viewTitle(view),
				subtitle: view.showsDate ? i18n.longDay(store.today) : null,
				open,
				done,
				today: store.today,
			},
			i18n,
		);
		printer.print(html).catch(() => undefined);
	};
}
