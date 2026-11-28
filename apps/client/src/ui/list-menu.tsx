import { useI18n } from "../i18n/i18n-context";
import { SORT_OPTIONS } from "../domain/view-settings";
import { useContainer } from "./container-context";
import { useExportActions } from "./export-host";
import { useObservable } from "./hooks";
import { MenuDivider, MenuItem, MenuOverlay, MenuPanel } from "./menu";
import { SORT_GLYPHS } from "./sort-glyphs";
import { ThemePanel } from "./theme-panel";
import { useDeleteList } from "./use-delete-list";
import { usePrintList } from "./use-print-list";

export type ListPanel = "menu" | "sort" | "theme";

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
	const { store } = useContainer();
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
	const print = usePrintList();
	const deleteList = useDeleteList();
	const exportActions = useExportActions();
	const sortItems = SORT_OPTIONS.map((option) => (
		<MenuItem
			key={option.key}
			glyph={SORT_GLYPHS[option.key]}
			label={t(option.labelKey)}
			selected={settings.sort === option.key}
			onPress={finish(() =>
				store.updateSettings(view.id, {
					sort: settings.sort === option.key ? null : option.key,
					sortDescending: false,
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
					{view.canEditList ? (
						<MenuItem
							glyph="rename"
							label={t("ctx.renameList")}
							onPress={finish(() => store.startRenaming(view.id))}
						/>
					) : null}
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
					{exportActions === null ? null : (
						<MenuItem
							glyph="export"
							label={t("ctx.exportList")}
							onPress={finish(exportActions.exportView)}
						/>
					)}
					{view.separatesCompleted ? (
						<MenuItem
							glyph="check"
							label={settings.hideCompleted ? t("menu.showCompleted") : t("menu.hideCompleted")}
							onPress={finish(() =>
								store.updateSettings(view.id, { hideCompleted: !settings.hideCompleted }),
							)}
						/>
					) : null}
					{view.isCustomList ? (
						<>
							<MenuDivider />
							<MenuItem
								glyph="trash"
								label={view.canEditList ? t("ctx.deleteList") : t("ctx.leaveList")}
								danger
								onPress={finish(() => void deleteList(view.id))}
							/>
						</>
					) : null}
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
