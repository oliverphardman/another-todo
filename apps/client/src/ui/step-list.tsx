import { useRef, useState } from "react";
import { TextInput, View } from "react-native";
import type { TaskStepData } from "../domain/task-step";
import { Icon } from "./icon";
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
	readonly onDelete: () => void;
}

export function StepRow({ step, onToggle, onRename, onDelete }: StepRowProps) {
	const palette = useTheme();
	const [title, setTitle] = useState(step.title);
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
							? `Mark step ${step.title} as not completed`
							: `Mark step ${step.title} as completed`
					}
					accessibilityState={{ checked: step.completed }}
					onPress={onToggle}
				>
					<Icon
						glyph={step.completed ? "check" : "circle"}
						size={20}
						color={palette.accent}
						strokeWidth={1.3}
					/>
				</PressableSurface>
				<TextInput
					accessibilityLabel={`Step ${step.title}`}
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
					accessibilityLabel={`Delete step ${step.title}`}
					onPress={onDelete}
					style={{ padding: 14 }}
				>
					<Icon glyph="close" size={16} color={palette.textSecondary} />
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
				accessibilityLabel="Add step"
				onPress={() => setEditing(true)}
				hoverColor={palette.surfaceHover}
				style={row}
			>
				<Icon glyph="plus" size={20} color={palette.accent} strokeWidth={1.3} />
				<AppText size={14} style={{ marginLeft: 14, color: palette.accent }}>
					Add step
				</AppText>
			</PressableSurface>
		);
	}
	return (
		<View style={row}>
			<Icon glyph="plus" size={20} color={palette.accent} strokeWidth={1.3} />
			<TextInput
				autoFocus
				blurOnSubmit={false}
				accessibilityLabel="New step"
				placeholder="Add step"
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
