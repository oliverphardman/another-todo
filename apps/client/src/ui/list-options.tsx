import { SORT_OPTIONS } from "../domain/view-settings";
import type { TaskView } from "../domain/task-view";
import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import type { ContextMenuEntry } from "./context-menu";
import { SORT_GLYPHS } from "./sort-glyphs";
import { ThemePanel } from "./theme-panel";

export interface ListOptionsContext {
	readonly store: TodoStore;
	readonly i18n: I18n;
	readonly view: TaskView;
	readonly print: () => void;
	readonly deleteList: (listId: string) => void;
	readonly exportList: (() => void) | null;
}

export function buildListOptions({
	store,
	i18n,
	view,
	print,
	deleteList,
	exportList,
}: ListOptionsContext): ContextMenuEntry[] {
	const { t } = i18n;
	const settings = store.settingsFor(view.id);
	const editable = view.canEditList;
	const entries: ContextMenuEntry[] = [];
	if (editable) {
		entries.push({
			kind: "action",
			key: "rename",
			glyph: "rename",
			label: t("ctx.renameList"),
			onPress: () => store.startRenaming(view.id),
		});
	}
	entries.push(
		{
			kind: "submenu",
			key: "sort",
			glyph: "sort",
			label: t("menu.sort"),
			entries: SORT_OPTIONS.map((option): ContextMenuEntry => ({
				kind: "action",
				key: `sort-${option.key}`,
				glyph: SORT_GLYPHS[option.key],
				label: t(option.labelKey),
				checked: settings.sort === option.key,
				onPress: () =>
					store.updateSettings(view.id, {
						sort: settings.sort === option.key ? null : option.key,
						sortDescending: false,
					}),
			})),
		},
		{
			kind: "panel",
			key: "theme",
			glyph: "palette",
			label: t("menu.theme"),
			render: (close) => <ThemePanel viewId={view.id} onClose={close} />,
		},
	);
	if (view.isCustomList) {
		entries.push({
			kind: "action",
			key: "duplicate",
			glyph: "duplicate",
			label: t("menu.duplicate"),
			onPress: () => store.duplicateList(view.id, t("list.copyOf", { name: view.title })),
		});
	}
	entries.push({
		kind: "action",
		key: "print",
		glyph: "print",
		label: t("menu.print"),
		onPress: print,
	});
	if (exportList !== null) {
		entries.push({
			kind: "action",
			key: "export",
			glyph: "export",
			label: t("ctx.exportList"),
			onPress: exportList,
		});
	}
	if (view.separatesCompleted) {
		entries.push({
			kind: "action",
			key: "hide-completed",
			glyph: "check",
			label: settings.hideCompleted ? t("menu.showCompleted") : t("menu.hideCompleted"),
			onPress: () => store.updateSettings(view.id, { hideCompleted: !settings.hideCompleted }),
		});
	}
	if (view.isCustomList) {
		entries.push({
			kind: "action",
			key: "delete",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: editable ? t("ctx.deleteList") : t("ctx.leaveList"),
			onPress: () => deleteList(view.id),
		});
	}
	return entries;
}
