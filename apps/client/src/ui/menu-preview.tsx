import { View } from "react-native";
import { CustomListView, DefaultListView, MyDayView, type TaskView } from "../domain/task-view";
import { TodoList } from "../domain/todo-list";
import { useI18n } from "../i18n/i18n-context";
import type { MenuStyle } from "../state/app-settings";
import { menuLook } from "./menu-look";
import { SidebarRow } from "./sidebar-row";
import { useIsDark, useTheme } from "./theme-context";

const ignore = () => undefined;

export function MenuPreview({ menuStyle }: { menuStyle: MenuStyle }) {
	const { t } = useI18n();
	const palette = useTheme();
	const dark = useIsDark();
	const look = menuLook(menuStyle);
	const examples: readonly { readonly view: TaskView; readonly count: number }[] = [
		{ view: new MyDayView(), count: 2 },
		{ view: new DefaultListView(), count: 9 },
		{
			view: new CustomListView(TodoList.create("preview-list", t("layout.exampleList"), "")),
			count: 3,
		},
	];
	return (
		<View
			pointerEvents="none"
			style={{
				paddingVertical: 8,
				borderRadius: 6,
				borderWidth: 1,
				borderColor: palette.border,
				backgroundColor: look.surface(palette).background,
			}}
		>
			<View aria-hidden importantForAccessibility="no-hide-descendants">
				{examples.map(({ view, count }, index) => (
					<SidebarRow
						key={view.id}
						look={look}
						view={view}
						selected={index === 0}
						count={count}
						iconColor={look.iconColor({ viewId: view.id, theme: null, palette, dark })}
						indented={false}
						onPress={ignore}
						listActions={null}
						marker={null}
						reorder={null}
					/>
				))}
			</View>
		</View>
	);
}
