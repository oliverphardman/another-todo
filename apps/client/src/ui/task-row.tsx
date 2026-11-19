import { View } from "react-native";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { CheckedCircle, Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export interface TaskRowProps {
	readonly task: Task;
	readonly subtitle: string | null;
	readonly overdue: boolean;
	readonly selected: boolean;
	readonly onToggleCompleted: () => void;
	readonly onToggleImportant: () => void;
	readonly onSelect: () => void;
}

export function TaskRow({
	task,
	subtitle,
	overdue,
	selected,
	onToggleCompleted,
	onToggleImportant,
	onSelect,
}: TaskRowProps) {
	const palette = useTheme();
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				backgroundColor: selected ? palette.accentSoft : palette.surface,
				borderRadius: 4,
				marginBottom: 2,
				minHeight: 52,
			}}
		>
			<PressableSurface
				accessibilityRole="checkbox"
				accessibilityLabel={task.completed ? "Mark as not completed" : "Mark as completed"}
				accessibilityState={{ checked: task.completed }}
				onPress={onToggleCompleted}
				style={{ padding: 14 }}
			>
				{task.completed ? (
					<CheckedCircle size={22} color={palette.accent} />
				) : (
					<Icon glyph="circle" size={22} color={palette.accent} />
				)}
			</PressableSurface>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={`Open ${task.title}`}
				onPress={onSelect}
				style={{ flex: 1, paddingVertical: 8 }}
			>
				<AppText
					size={15}
					tone={task.completed ? "secondary" : "primary"}
					style={task.completed ? { textDecorationLine: "line-through" } : undefined}
				>
					{task.title}
				</AppText>
				{subtitle === null ? null : (
					<AppText size={12} tone={overdue && !task.completed ? "danger" : "secondary"}>
						{subtitle}
					</AppText>
				)}
			</PressableSurface>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={task.important ? "Remove importance" : "Mark as important"}
				onPress={onToggleImportant}
				style={{ padding: 14 }}
			>
				<Icon glyph={task.important ? "starFilled" : "star"} size={20} color={palette.accent} />
			</PressableSurface>
		</View>
	);
}
