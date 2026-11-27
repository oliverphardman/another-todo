import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import type { ContextMenuEntry } from "./context-menu";
import { buildListContextMenu } from "./list-context-menu";
import { buildListOptions } from "./list-options";
import { buildTaskMenu } from "./task-menu";

export interface MenuBarContext {
	readonly store: TodoStore;
	readonly i18n: I18n;
	readonly print: () => void;
	readonly exportList: (() => void) | null;
	readonly deleteTasks: (taskIds: readonly string[]) => void;
	readonly logOut: (() => void) | null;
}

export class MenuBarMenus {
	static build(context: MenuBarContext): ContextMenuEntry[] {
		const { t } = context.i18n;
		const account: ContextMenuEntry[] =
			context.logOut === null
				? []
				: [
						MenuBarMenus.menu("app", t("app.name"), [
							{
								kind: "action",
								key: "log-out",
								glyph: "signOut",
								label: t("account.logOut"),
								onPress: context.logOut,
							},
						]),
					];
		return [
			...account,
			MenuBarMenus.menu("task", t("menubar.task"), MenuBarMenus.task(context)),
			MenuBarMenus.menu("list", t("menubar.list"), MenuBarMenus.list(context)),
		];
	}

	private static menu(
		key: string,
		label: string,
		entries: readonly ContextMenuEntry[],
	): ContextMenuEntry {
		return {
			kind: "submenu",
			key,
			glyph: "list",
			label,
			entries: MenuBarMenus.within(key, entries),
		};
	}

	private static within(scope: string, entries: readonly ContextMenuEntry[]): ContextMenuEntry[] {
		return entries.map((entry) => {
			const key = `${scope}/${entry.key}`;
			return entry.kind === "submenu"
				? { ...entry, key, entries: MenuBarMenus.within(key, entry.entries) }
				: { ...entry, key };
		});
	}

	private static task({ store, i18n, deleteTasks }: MenuBarContext): ContextMenuEntry[] {
		const selected = store.selectedTasks.map((task) => task.id);
		if (selected.length > 0) {
			return buildTaskMenu(store, i18n, selected, deleteTasks);
		}
		return [
			{
				kind: "action",
				key: "none",
				glyph: "check",
				label: i18n.t("menubar.noTask"),
				disabled: true,
				onPress: () => undefined,
			},
		];
	}

	private static list({ store, i18n, print, exportList }: MenuBarContext): ContextMenuEntry[] {
		const view = store.selectedView;
		const options = buildListOptions({ store, i18n, view, print, exportList });
		if (!view.isCustomList) {
			return options;
		}
		const actions = buildListContextMenu({
			store,
			i18n,
			listId: view.id,
			print,
			exportList,
			onRename: () => store.startRenaming(view.id),
		});
		const shared = new Set(actions.map((entry) => entry.key));
		const extras = options.filter((entry) => !shared.has(entry.key));
		const removal = actions.length - 1;
		return [...actions.slice(0, removal), ...extras, actions[removal]!];
	}
}
