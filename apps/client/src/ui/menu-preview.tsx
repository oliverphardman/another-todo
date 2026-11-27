import { View } from "react-native";
import { CustomListView, DefaultListView, MyDayView, type TaskView } from "../domain/task-view";
import { TodoList } from "../domain/todo-list";
import { useI18n } from "../i18n/i18n-context";
import type { MenuStyle } from "../state/app-settings";
import { menuMetrics } from "./menu-metrics";
import { SidebarColors } from "./sidebar-colors";
import { SidebarRow } from "./sidebar-row";
import { useIsDark, useTheme } from "./theme-context";

const ignore = () => undefined;

export function MenuPreview({ menuStyle }: { menuStyle: MenuStyle }) {
	const { t } = useI18n();
	const palette = useTheme();
	const dark = useIsDark();
	const metrics = menuMetrics(menuStyle);
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
				backgroundColor: palette.sidebar,
			}}
		>
			<View aria-hidden importantForAccessibility="no-hide-descendants">
				{examples.map(({ view, count }, index) => (
					<SidebarRow
						key={view.id}
						metrics={metrics}
						view={view}
						selected={index === 0}
						count={count}
						iconColor={SidebarColors.icon(view.id, null, palette.sidebar, dark)}
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
