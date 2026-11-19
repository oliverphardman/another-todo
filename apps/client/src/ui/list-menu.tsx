import { SORT_OPTIONS, type SortKey } from "../domain/view-settings";
import { ListPrintDocument } from "../print/list-print-document";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import type { IconGlyph } from "./icon";
import { MenuItem, MenuOverlay, MenuPanel } from "./menu";
import { ThemePanel } from "./theme-panel";

export type ListPanel = "menu" | "sort" | "theme";

const SORT_GLYPHS: Record<SortKey, IconGlyph> = {
	importance: "star",
	alphabetical: "arrowsUpDown",
	due: "calendar",
	created: "calendarPlus",
	myDay: "sun",
};

const TOP = 56;
const MAIN_WIDTH = 240;
const SORT_WIDTH = 230;

export interface ListMenuProps {
	readonly panel: ListPanel;
	readonly compact: boolean;
	readonly onPanel: (panel: ListPanel) => void;
	readonly onClose: () => void;
}

export function ListMenu({ panel, compact, onPanel, onClose }: ListMenuProps) {
	const { store, printer } = useContainer();
	useObservable(store);
	const view = store.selectedView;
	const settings = store.settingsFor(view.id);
	const main = { top: TOP, right: 12, width: MAIN_WIDTH };
	const finish = (action: () => void) => () => {
		action();
		onClose();
	};
	const print = () => {
		const { open, done } = store.visibleTasks();
		const html = ListPrintDocument.html({
			title: view.title,
			subtitle: view.subtitle(store.today),
			open,
			done,
			today: store.today,
		});
		printer.print(html).catch(() => undefined);
	};
	const sortItems = SORT_OPTIONS.map((option) => (
		<MenuItem
			key={option.key}
			glyph={SORT_GLYPHS[option.key]}
			label={option.label}
			selected={settings.sort === option.key}
			onPress={finish(() =>
				store.updateSettings(view.id, {
					sort: settings.sort === option.key ? null : option.key,
				}),
			)}
		/>
	));
	return (
		<MenuOverlay onDismiss={onClose}>
			{panel === "theme" ? (
				<MenuPanel label="Change theme" placement={{ top: TOP, right: 12, width: 300 }}>
					<ThemePanel viewId={view.id} onClose={onClose} />
				</MenuPanel>
			) : null}
			{panel === "sort" && compact ? (
				<MenuPanel label="Sort" placement={main}>
					<MenuItem glyph="back" label="Back" onPress={() => onPanel("menu")} />
					{sortItems}
				</MenuPanel>
			) : null}
			{panel === "menu" || (panel === "sort" && !compact) ? (
				<MenuPanel label="List options" placement={main}>
					<MenuItem glyph="sort" label="Sort" trailing="chevron" onPress={() => onPanel("sort")} />
					<MenuItem glyph="palette" label="Change Theme…" onPress={() => onPanel("theme")} />
					{view.isCustomList ? (
						<MenuItem
							glyph="duplicate"
							label="Duplicate List"
							onPress={finish(() => store.duplicateList(view.id))}
						/>
					) : null}
					<MenuItem glyph="print" label="Print List" onPress={finish(print)} />
					<MenuItem
						glyph="check"
						label={settings.hideCompleted ? "Show Completed Tasks" : "Hide Completed Tasks"}
						onPress={finish(() =>
							store.updateSettings(view.id, { hideCompleted: !settings.hideCompleted }),
						)}
					/>
				</MenuPanel>
			) : null}
			{panel === "sort" && !compact ? (
				<MenuPanel
					label="Sort"
					placement={{ top: TOP, right: 12 + MAIN_WIDTH + 8, width: SORT_WIDTH }}
				>
					{sortItems}
				</MenuPanel>
			) : null}
		</MenuOverlay>
	);
}
