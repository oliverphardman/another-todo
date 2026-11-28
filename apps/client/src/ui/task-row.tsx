import { useI18n } from "../i18n/i18n-context";
import { View } from "react-native";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContextMenuTrigger, type ContextMenuEntry } from "./context-menu";
import { CheckCircle } from "./check-circle";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { TaskSubtitle, type SubtitlePart } from "./task-subtitle";
import type { RowStyle } from "../state/app-settings";
import { rowMetrics } from "./row-metrics";
import { useTheme } from "./theme-context";

export interface TaskRowProps {
	readonly task: Task;
	readonly subtitle: readonly SubtitlePart[];
	readonly overdue: boolean;
	readonly selected: boolean;
	readonly rowStyle: RowStyle;
	readonly onToggleCompleted: () => void;
	readonly onToggleImportant: () => void;
	readonly onSelect: (event: unknown) => void;
	readonly marker: "before" | "after" | null;
	readonly onDragStart: ((event: unknown) => void) | null;
	readonly buildMenu: () => readonly ContextMenuEntry[];
}

export function TaskRow({
	task,
	subtitle,
	overdue,
	selected,
	rowStyle,
	onToggleCompleted,
	onToggleImportant,
	onSelect,
	marker,
	onDragStart,
	buildMenu,
}: TaskRowProps) {
	const palette = useTheme();
	const { t } = useI18n();
	const menu = useContextMenuTrigger(t("ctx.taskMenu"), buildMenu);
	const metrics = rowMetrics(rowStyle);
	return (
		<View
			{...({
				dataSet: { taskRow: task.completed ? undefined : task.id, dropMarker: marker ?? "none" },
			} as object)}
			style={{
				flexDirection: "row",
				alignItems: "center",
				borderTopWidth: 2,
				borderTopColor: marker === "before" ? palette.accent : "transparent",
				borderBottomWidth: 2,
				borderBottomColor: marker === "after" ? palette.accent : "transparent",
				backgroundColor: selected ? palette.accentSoft : palette.surface,
				borderRadius: 4,
				marginBottom: metrics.gap,
				minHeight: metrics.height,
			}}
		>
			<CheckCircle
				identity={task.id}
				completed={task.completed}
				label={task.completed ? t("task.uncomplete") : t("task.complete")}
				{...metrics.circle}
				onToggle={onToggleCompleted}
				onContextMenu={menu.onContextMenu}
				onLongPress={menu.onLongPress}
				style={metrics.circleControl}
			/>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("task.open", { title: task.title })}
				{...(onDragStart === null ? {} : ({ onMouseDown: onDragStart } as object))}
				onPress={onSelect}
				onContextMenu={menu.onContextMenu}
				onLongPress={menu.onLongPress}
				style={{ flex: 1, paddingVertical: metrics.textPadding, cursor: "default" as never }}
			>
				<AppText
					size={metrics.titleSize}
					tone={task.completed ? "secondary" : "primary"}
					style={task.completed ? { textDecorationLine: "line-through" } : undefined}
				>
					{task.title}
				</AppText>
				{subtitle.length === 0 ? null : (
					<TaskSubtitle parts={subtitle} overdue={overdue && !task.completed} rowStyle={rowStyle} />
				)}
			</PressableSurface>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={task.important ? t("task.removeImportance") : t("task.makeImportant")}
				onPress={onToggleImportant}
				onContextMenu={menu.onContextMenu}
				onLongPress={menu.onLongPress}
				style={{ ...metrics.starControl, cursor: "default" as never }}
			>
				<Icon
					glyph={task.important ? "starFilled" : "star"}
					size={metrics.starSize}
					color={palette.accent}
				/>
			</PressableSurface>
		</View>
	);
}
