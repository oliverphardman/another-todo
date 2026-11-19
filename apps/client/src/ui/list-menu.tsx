import { useI18n } from "../i18n/i18n-context";
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
	const i18n = useI18n();
	const { t } = i18n;
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
	const sortItems = SORT_OPTIONS.map((option) => (
		<MenuItem
			key={option.key}
			glyph={SORT_GLYPHS[option.key]}
			label={t(option.labelKey)}
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
				<MenuPanel label={t("menu.themePanel")} placement={{ top: TOP, right: 12, width: 300 }}>
					<ThemePanel viewId={view.id} onClose={onClose} />
				</MenuPanel>
			) : null}
			{panel === "sort" && compact ? (
				<MenuPanel label={t("menu.sort")} placement={main}>
					<MenuItem glyph="back" label={t("menu.back")} onPress={() => onPanel("menu")} />
					{sortItems}
				</MenuPanel>
			) : null}
			{panel === "menu" || (panel === "sort" && !compact) ? (
				<MenuPanel label={t("list.options")} placement={main}>
					<MenuItem
						glyph="sort"
						label={t("menu.sort")}
						trailing="chevron"
						onPress={() => onPanel("sort")}
					/>
					<MenuItem glyph="palette" label={t("menu.theme")} onPress={() => onPanel("theme")} />
					{view.isCustomList ? (
						<MenuItem
							glyph="duplicate"
							label={t("menu.duplicate")}
							onPress={finish(() =>
								store.duplicateList(view.id, t("list.copyOf", { name: view.title })),
							)}
						/>
					) : null}
					<MenuItem glyph="print" label={t("menu.print")} onPress={finish(print)} />
					<MenuItem
						glyph="check"
						label={settings.hideCompleted ? t("menu.showCompleted") : t("menu.hideCompleted")}
						onPress={finish(() =>
							store.updateSettings(view.id, { hideCompleted: !settings.hideCompleted }),
						)}
					/>
				</MenuPanel>
			) : null}
			{panel === "sort" && !compact ? (
				<MenuPanel
					label={t("menu.sort")}
					placement={{ top: TOP, right: 12 + MAIN_WIDTH + 8, width: SORT_WIDTH }}
				>
					{sortItems}
				</MenuPanel>
			) : null}
		</MenuOverlay>
	);
}
