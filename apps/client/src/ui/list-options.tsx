import { SORT_OPTIONS } from "../domain/view-settings";
import type { TaskView } from "../domain/task-view";
import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import type { ContextMenuEntry } from "./context-menu";
import { SharePanel } from "./share-panel";
import { ThemePanel } from "./theme-panel";

export interface ListOptionsContext {
	readonly store: TodoStore;
	readonly i18n: I18n;
	readonly view: TaskView;
	readonly print: () => void;
}

export function buildListOptions({
	store,
	i18n,
	view,
	print,
}: ListOptionsContext): ContextMenuEntry[] {
	const { t } = i18n;
	const settings = store.settingsFor(view.id);
	const editable = view.canEditList;
	const entries: ContextMenuEntry[] = [
		{
			kind: "submenu",
			key: "sort",
			glyph: "sort",
			label: t("menu.sort"),
			entries: SORT_OPTIONS.map((option): ContextMenuEntry => ({
				kind: "action",
				key: `sort-${option.key}`,
				glyph: "sort",
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
	];
	if (view.isCustomList) {
		entries.push({
			kind: "action",
			key: "duplicate",
			glyph: "duplicate",
			label: t("menu.duplicate"),
			onPress: () => store.duplicateList(view.id, t("list.copyOf", { name: view.title })),
		});
	}
	if (editable) {
		entries.push(
			{
				kind: "action",
				key: "create-group",
				glyph: "group",
				label: t("ctx.createGroup"),
				onPress: () => store.createGroupFor(view.id, t("group.new")),
			},
			{
				kind: "panel",
				key: "share",
				glyph: "people",
				label: t("ctx.shareList"),
				render: (close) => <SharePanel listId={view.id} onClose={close} />,
			},
			{
				kind: "action",
				key: "rename",
				glyph: "edit",
				label: t("ctx.renameList"),
				onPress: () => store.startRenaming(view.id),
			},
		);
	}
	entries.push(
		{ kind: "action", key: "print", glyph: "print", label: t("menu.print"), onPress: print },
		{
			kind: "action",
			key: "hide-completed",
			glyph: "check",
			label: settings.hideCompleted ? t("menu.showCompleted") : t("menu.hideCompleted"),
			onPress: () => store.updateSettings(view.id, { hideCompleted: !settings.hideCompleted }),
		},
	);
	if (view.isCustomList) {
		entries.push({
			kind: "action",
			key: "delete",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: editable ? t("ctx.deleteList") : t("ctx.leaveList"),
			onPress: () => store.deleteList(view.id),
		});
	}
	return entries;
}
