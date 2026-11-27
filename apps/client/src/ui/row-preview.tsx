import { View } from "react-native";
import { Task } from "../domain/task";
import { useI18n } from "../i18n/i18n-context";
import type { RowStyle } from "../state/app-settings";
import { useContainer } from "./container-context";
import { TaskRow } from "./task-row";
import { useTheme } from "./theme-context";

const ignore = () => undefined;

export interface RowPreviewProps {
	readonly rowStyle: RowStyle;
	readonly titles: readonly string[];
}

export function RowPreview({ rowStyle, titles }: RowPreviewProps) {
	const { store } = useContainer();
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const subtitle = [{ text: t("view.tasks") }, { text: i18n.dueLabel(store.today, store.today) }];
	return (
		<View
			pointerEvents="none"
			style={{ padding: 8, borderRadius: 6, backgroundColor: palette.background }}
		>
			<View aria-hidden importantForAccessibility="no-hide-descendants">
				{titles.map((title) => (
					<TaskRow
						key={title}
						task={Task.create(`preview-${title}`, title, "")}
						subtitle={subtitle}
						overdue={false}
						selected={false}
						rowStyle={rowStyle}
						onToggleCompleted={ignore}
						onToggleImportant={ignore}
						onSelect={ignore}
						marker={null}
						onDragStart={null}
						buildMenu={() => []}
					/>
				))}
			</View>
		</View>
	);
}
