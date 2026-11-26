import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { TextField } from "./text-field";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<View style={{ marginTop: 20 }}>
			<AppText role="heading" size={16} weight="600" style={{ marginBottom: 8 }}>
				{title}
			</AppText>
			{children}
		</View>
	);
}

export interface CheckboxProps {
	readonly label: string;
	readonly checked: boolean;
	readonly onChange: (checked: boolean) => void;
	readonly disabled?: boolean;
	readonly hint?: string;
}

export function Checkbox({ label, checked, onChange, disabled = false, hint }: CheckboxProps) {
	const palette = useTheme();
	return (
		<PressableSurface
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked, disabled }}
			aria-checked={checked}
			disabled={disabled}
			onPress={() => onChange(!checked)}
			style={{
				flexDirection: "row",
				alignItems: "flex-start",
				paddingVertical: 8,
				opacity: disabled ? 0.45 : 1,
			}}
		>
			<View
				style={{
					width: 18,
					height: 18,
					borderRadius: 3,
					borderWidth: 1.5,
					borderColor: checked ? palette.accent : palette.textSecondary,
					backgroundColor: checked ? palette.accent : "transparent",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				{checked ? <Icon glyph="tick" size={14} color={palette.surface} strokeWidth={3} /> : null}
			</View>
			<View style={{ flex: 1, marginLeft: 10 }}>
				<AppText size={14}>{label}</AppText>
				{hint === undefined ? null : (
					<AppText size={12} tone="secondary">
						{hint}
					</AppText>
				)}
			</View>
		</PressableSurface>
	);
}

export interface ChoiceProps<Value extends string> {
	readonly label: string;
	readonly value: Value;
	readonly options: readonly { readonly value: Value; readonly label: string }[];
	readonly onChange: (value: Value) => void;
}

export function Choice<Value extends string>({
	label,
	value,
	options,
	onChange,
}: ChoiceProps<Value>) {
	const palette = useTheme();
	return (
		<View style={{ paddingVertical: 8 }}>
			<AppText size={14} style={{ marginBottom: 6 }}>
				{label}
			</AppText>
			<View
				accessibilityRole="radiogroup"
				accessibilityLabel={label}
				style={{ flexDirection: "row", gap: 8 }}
			>
				{options.map((option) => {
					const selected = option.value === value;
					return (
						<PressableSurface
							key={option.value}
							accessibilityRole="radio"
							accessibilityLabel={option.label}
							accessibilityState={{ checked: selected }}
							aria-checked={selected}
							onPress={() => onChange(option.value)}
							style={{
								paddingHorizontal: 16,
								paddingVertical: 7,
								borderRadius: 4,
								borderWidth: 1,
								borderColor: selected ? palette.accent : palette.border,
								backgroundColor: selected ? palette.accentSoft : "transparent",
							}}
						>
							<AppText size={14} weight={selected ? "600" : "400"}>
								{option.label}
							</AppText>
						</PressableSurface>
					);
				})}
			</View>
		</View>
	);
}

export interface NumberFieldProps {
	readonly label: string;
	readonly value: number;
	readonly onCommit: (value: number) => void;
	readonly disabled: boolean;
}

export function NumberField({ label, value, onCommit, disabled }: NumberFieldProps) {
	const palette = useTheme();
	const [text, setText] = useState(String(value));
	useEffect(() => setText(String(value)), [value]);
	const commit = () => {
		const entered = Number.parseInt(text, 10);
		if (Number.isNaN(entered)) {
			setText(String(value));
			return;
		}
		onCommit(entered);
		setText(String(value));
	};
	return (
		<TextField
			accessibilityLabel={label}
			editable={!disabled}
			keyboardType="number-pad"
			value={text}
			onChangeText={(next) => setText(next.replace(/\D/g, ""))}
			onBlur={commit}
			onSubmitEditing={commit}
			style={
				{
					width: 64,
					marginHorizontal: 8,
					paddingVertical: 6,
					paddingHorizontal: 8,
					borderRadius: 4,
					borderWidth: 1,
					borderColor: palette.border,
					...fontStyle(),
					fontSize: 14,
					color: palette.text,
					textAlign: "center",
					outlineStyle: "none",
				} as object
			}
		/>
	);
}
