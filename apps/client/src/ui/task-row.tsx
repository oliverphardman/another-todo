import { useI18n } from "../i18n/i18n-context";
import { useEffect, useRef, useState } from "react";
import { Animated, View } from "react-native";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContextMenuTrigger, type ContextMenuEntry } from "./context-menu";
import { CheckedCircle, Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useContainer } from "./container-context";
import type { RowStyle } from "../state/app-settings";
import { rowMetrics } from "./row-metrics";
import { useTheme } from "./theme-context";

export interface TaskRowProps {
	readonly task: Task;
	readonly subtitle: string | null;
	readonly overdue: boolean;
	readonly travel: number;
	readonly selected: boolean;
	readonly rowStyle: RowStyle;
	readonly onToggleCompleted: (silent?: boolean) => void;
	readonly onCompleting: () => void;
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
	travel,
	selected,
	rowStyle,
	onToggleCompleted,
	onCompleting,
	onToggleImportant,
	onSelect,
	marker,
	onDragStart,
	buildMenu,
}: TaskRowProps) {
	const palette = useTheme();
	const { t } = useI18n();
	const menu = useContextMenuTrigger(t("ctx.taskMenu"), buildMenu);
	const { motion } = useContainer();
	const metrics = rowMetrics(rowStyle);
	const [completing, setCompleting] = useState(false);
	const fill = useRef(new Animated.Value(0)).current;
	const slide = useRef(new Animated.Value(0)).current;
	const alive = useRef(true);
	useEffect(
		() => () => {
			alive.current = false;
		},
		[],
	);
	const toggle = () => {
		if (task.completed || motion.fillMs === 0 || completing) {
			onToggleCompleted();
			return;
		}
		setCompleting(true);
		onCompleting();
		Animated.parallel([
			Animated.timing(fill, { toValue: 1, duration: motion.fillMs, useNativeDriver: false }),
			Animated.timing(slide, {
				toValue: travel,
				duration: motion.travelMs,
				useNativeDriver: false,
			}),
		]).start(() => {
			if (alive.current) {
				onToggleCompleted(true);
				setCompleting(false);
				fill.setValue(0);
				slide.setValue(0);
			}
		});
	};
	return (
		<Animated.View
			style={{
				zIndex: completing ? -1 : 0,
				transform: [{ translateY: slide }],
			}}
		>
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
				<PressableSurface
					accessibilityRole="checkbox"
					accessibilityLabel={task.completed ? t("task.uncomplete") : t("task.complete")}
					accessibilityState={{ checked: task.completed }}
					onPress={toggle}
					onContextMenu={menu.onContextMenu}
					onLongPress={menu.onLongPress}
					style={{ ...metrics.control, cursor: "default" as never }}
				>
					{task.completed ? (
						<CheckedCircle size={22} color={palette.accent} />
					) : (
						<View>
							<Icon glyph="circle" size={22} color={palette.accent} />
							{completing ? (
								<Animated.View style={{ position: "absolute", opacity: fill }}>
									<CheckedCircle size={22} color={palette.accent} />
								</Animated.View>
							) : null}
						</View>
					)}
				</PressableSurface>
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
					accessibilityLabel={task.important ? t("task.removeImportance") : t("task.makeImportant")}
					onPress={onToggleImportant}
					onContextMenu={menu.onContextMenu}
					onLongPress={menu.onLongPress}
					style={{ ...metrics.control, cursor: "default" as never }}
				>
					<Icon glyph={task.important ? "starFilled" : "star"} size={20} color={palette.accent} />
				</PressableSurface>
			</View>
		</Animated.View>
	);
}
