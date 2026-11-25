import { useEffect, useRef } from "react";
import { useWindowDimensions } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { useContainer } from "./container-context";
import { useContextMenuController, type ContextMenuEntry } from "./context-menu";
import { useObservable } from "./hooks";
import { MenuBar } from "./menu-bar";
import { MenuBarMenus } from "./menu-bar-menus";
import { NativeMenu } from "./native-menu";
import { useDeleteTasks } from "./use-delete-tasks";
import { usePrintList } from "./use-print-list";

const PANEL_HALF_WIDTH = 135;
const PANEL_TOP = 80;

export function MenuBarSync() {
	const { store } = useContainer();
	const i18n = useI18n();
	useObservable(store);
	const deleteTasks = useDeleteTasks();
	const print = usePrintList();
	const controller = useContextMenuController();
	const { width } = useWindowDimensions();
	const bridge = MenuBar.bridge;
	const menus = bridge.isAvailable() ? MenuBarMenus.build({ store, i18n, print, deleteTasks }) : [];
	const items = NativeMenu.items(menus);
	const shown = JSON.stringify(items);
	const choose = (key: string) => {
		const entry: ContextMenuEntry | null = NativeMenu.find(menus, key);
		if (entry?.kind === "action") {
			entry.onPress();
		} else if (entry?.kind === "panel") {
			controller.open({
				x: width / 2 - PANEL_HALF_WIDTH,
				y: PANEL_TOP,
				label: entry.label,
				entries: [],
				initialPanel: entry,
			});
		}
	};
	const latest = useRef(choose);
	latest.current = choose;
	useEffect(() => {
		if (bridge.isAvailable()) {
			bridge.show(items);
		}
	}, [bridge, shown]);
	useEffect(() => {
		if (!bridge.isAvailable()) {
			return undefined;
		}
		let listening = true;
		const listen = async () => {
			while (listening) {
				const key = await bridge.nextSelection();
				if (listening && key !== null) {
					latest.current(key);
				}
			}
		};
		listen().catch(() => undefined);
		return () => {
			listening = false;
			bridge.show([]);
		};
	}, [bridge]);
	return null;
}
