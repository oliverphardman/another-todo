import { useI18n } from "../i18n/i18n-context";
import { useRef, useState } from "react";
import { View } from "react-native";
import { TextField } from "./text-field";
import type { TaskStepData } from "../domain/task-step";
import { CheckedCircle, Icon } from "./icon";
import { useContextMenuTrigger } from "./context-menu";
import { PressableSurface } from "./pressable-surface";
import { DETAIL_ROW_HEIGHT, DetailSeparator } from "./detail-card";
import { AppText } from "./app-text";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

const INPUT_STYLE = {
	flex: 1,
	minWidth: 0,
	marginLeft: 14,
	padding: 0,
	fontFamily: FONT_FAMILY,
	fontSize: 14,
	outlineStyle: "none",
} as object;

export interface StepRowProps {
	readonly step: TaskStepData;
	readonly onToggle: () => void;
	readonly onRename: (title: string) => void;
	readonly onPromote: () => void;
	readonly onDelete: () => void;
}

export function StepRow({ step, onToggle, onRename, onPromote, onDelete }: StepRowProps) {
	const palette = useTheme();
	const { t } = useI18n();
	const [title, setTitle] = useState(step.title);
	const menu = useContextMenuTrigger(t("step.menu"), () => [
		{
			kind: "action",
			key: "toggle",
			glyph: "check",
			label: step.completed ? t("step.markNotCompleted") : t("step.markCompleted"),
			onPress: onToggle,
		},
		{ kind: "action", key: "promote", glyph: "move", label: t("step.promote"), onPress: onPromote },
		{
			kind: "action",
			key: "delete",
			separatorBefore: true,
			danger: true,
			glyph: "trash",
			label: t("step.deleteStep"),
			onPress: onDelete,
		},
	]);
	const commit = () => {
		if (title.trim().length === 0) {
			setTitle(step.title);
		} else if (title.trim() !== step.title) {
			onRename(title);
		}
	};
	return (
		<>
			<DetailSeparator />
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					minHeight: DETAIL_ROW_HEIGHT,
					paddingLeft: 14,
				}}
			>
				<PressableSurface
					accessibilityRole="checkbox"
					accessibilityLabel={
						step.completed
							? t("step.uncomplete", { title: step.title })
							: t("step.complete", { title: step.title })
					}
					accessibilityState={{ checked: step.completed }}
					onPress={onToggle}
				>
					{step.completed ? (
						<CheckedCircle size={20} color={palette.accent} />
					) : (
						<Icon glyph="circle" size={20} color={palette.accent} strokeWidth={1.3} />
					)}
				</PressableSurface>
				<TextField
					accessibilityLabel={t("step.named", { title: step.title })}
					value={title}
					onChangeText={setTitle}
					onBlur={commit}
					onSubmitEditing={commit}
					style={[
						INPUT_STYLE,
						{
							color: step.completed ? palette.textSecondary : palette.text,
							textDecorationLine: step.completed ? "line-through" : "none",
						},
					]}
				/>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("step.options", { title: step.title })}
					onPress={menu.onContextMenu}
					onContextMenu={menu.onContextMenu}
					onLongPress={menu.onLongPress}
					style={{ padding: 14 }}
				>
					<Icon glyph="more" size={16} color={palette.textSecondary} />
				</PressableSurface>
			</View>
		</>
	);
}

export interface AddStepRowProps {
	readonly onAdd: (title: string) => void;
}

export function AddStepRow({ onAdd }: AddStepRowProps) {
	const palette = useTheme();
	const { t } = useI18n();
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState("");
	const latest = useRef("");
	const change = (value: string) => {
		latest.current = value;
		setText(value);
	};
	const flush = () => {
		if (latest.current.trim().length > 0) {
			onAdd(latest.current);
		}
		change("");
	};
	const row = {
		flexDirection: "row",
		alignItems: "center",
		minHeight: DETAIL_ROW_HEIGHT,
		paddingHorizontal: 14,
	} as const;
	if (!editing) {
		return (
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("step.add")}
				onPress={() => setEditing(true)}
				hoverColor={palette.surfaceHover}
				style={row}
			>
				<Icon glyph="plus" size={20} color={palette.accent} strokeWidth={1.3} />
				<AppText size={14} style={{ marginLeft: 14, color: palette.accent }}>
					{t("step.add")}
				</AppText>
			</PressableSurface>
		);
	}
	return (
		<View style={row}>
			<Icon glyph="plus" size={20} color={palette.accent} strokeWidth={1.3} />
			<TextField
				autoFocus
				blurOnSubmit={false}
				accessibilityLabel={t("step.new")}
				placeholder={t("step.add")}
				placeholderTextColor={palette.accent}
				value={text}
				onChangeText={change}
				onSubmitEditing={flush}
				onBlur={() => {
					flush();
					setEditing(false);
				}}
				onKeyPress={(event) => {
					if (event.nativeEvent.key === "Escape") {
						change("");
						setEditing(false);
					}
				}}
				style={[INPUT_STYLE, { color: palette.text }]}
			/>
		</View>
	);
}
