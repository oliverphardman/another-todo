import type { I18n } from "../i18n/i18n";
import type { TodoStore } from "../state/todo-store";
import type { ContextMenuEntry } from "./context-menu";
import { SharePanel } from "./share-panel";

export interface ListContextMenuContext {
	readonly store: TodoStore;
	readonly i18n: I18n;
	readonly listId: string;
	readonly print: () => void;
	readonly onRename: () => void;
}

export function buildListContextMenu({
	store,
	i18n,
	listId,
	print,
	onRename,
}: ListContextMenuContext): ContextMenuEntry[] {
	const { t } = i18n;
	const state = store.get();
	const list = state.lists.find((entry) => entry.id === listId)!;
	const siblings = store.orderedLists().filter((entry) => entry.groupId === list.groupId);
	const position = siblings.findIndex((entry) => entry.id === listId);
	const printEntry: ContextMenuEntry = {
		kind: "action",
		key: "print",
		glyph: "print",
		label: t("ctx.printList"),
		onPress: () => {
			store.select(listId);
			print();
		},
	};
	const removeEntry: ContextMenuEntry = {
		kind: "action",
		key: "delete",
		separatorBefore: true,
		danger: true,
		glyph: "trash",
		label: list.owned ? t("ctx.deleteList") : t("ctx.leaveList"),
		onPress: () => store.deleteList(listId),
	};
	if (!list.owned) {
		return [printEntry, removeEntry];
	}
	const groupMoves: ContextMenuEntry[] = [
		...(list.groupId === null
			? []
			: [
					{
						kind: "action" as const,
						key: "ungroup-list",
						glyph: "close" as const,
						label: t("ctx.removeFromGroup"),
						onPress: () => store.setListGroup(listId, null),
					},
				]),
		...state.groups
			.filter((group) => group.id !== list.groupId)
			.map((group): ContextMenuEntry => ({
				kind: "action",
				key: `to-${group.id}`,
				glyph: "group",
				label: group.name,
				onPress: () => store.setListGroup(listId, group.id),
			})),
	];
	return [
		{
			kind: "action",
			key: "create-group",
			glyph: "group",
			label: t("ctx.createGroup"),
			onPress: () => store.createGroupFor(listId, t("group.new")),
		},
		{
			kind: "submenu",
			key: "move-to-group",
			glyph: "move",
			label: t("ctx.moveToGroup"),
			entries: groupMoves,
		},
		{
			kind: "action",
			key: "move-up",
			glyph: "chevronUp",
			label: t("ctx.moveListUp"),
			disabled: position === 0,
			onPress: () => store.shiftList(listId, -1),
		},
		{
			kind: "action",
			key: "move-down",
			glyph: "chevronDown",
			label: t("ctx.moveListDown"),
			disabled: position === siblings.length - 1,
			onPress: () => store.shiftList(listId, 1),
		},
		{
			kind: "panel",
			key: "share",
			separatorBefore: true,
			glyph: "addPerson",
			label: t("ctx.shareList"),
			render: (close) => <SharePanel listId={listId} onClose={close} />,
		},
		{
			kind: "action",
			key: "rename",
			glyph: "rename",
			label: t("ctx.renameList"),
			onPress: onRename,
		},
		printEntry,
		removeEntry,
	];
}
