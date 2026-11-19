import { useI18n } from "../i18n/i18n-context";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { DueDay } from "../domain/due-day";
import { AppText } from "./app-text";
import { PressableSurface } from "./pressable-surface";
import { FONT_FAMILY } from "./theme";
import { useTheme } from "./theme-context";

export interface DueDatePickerProps {
	readonly day: string | null;
	readonly today: string;
	readonly onChange: (day: string | null) => void;
}

export function DueDatePicker({ day, today, onChange }: DueDatePickerProps) {
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const [custom, setCustom] = useState("");
	const options = [
		{ label: t("due.today"), day: today },
		{ label: t("due.tomorrow"), day: DueDay.add(today, 1) },
		{ label: t("due.nextWeek"), day: DueDay.nextWeek(today) },
	];
	const valid = DueDay.isValid(custom);
	return (
		<View accessibilityLabel={t("due.options")}>
			{options.map((option) => (
				<PressableSurface
					key={option.label}
					accessibilityRole="button"
					accessibilityLabel={t("due.option", { label: option.label })}
					onPress={() => onChange(option.day)}
					hoverColor={palette.surfaceHover}
					style={{
						flexDirection: "row",
						justifyContent: "space-between",
						padding: 12,
					}}
				>
					<AppText>{option.label}</AppText>
					<AppText tone="secondary">{i18n.shortDay(option.day)}</AppText>
				</PressableSurface>
			))}
			<View style={{ flexDirection: "row", alignItems: "center", padding: 12 }}>
				<TextInput
					accessibilityLabel={t("due.custom")}
					placeholder={t("due.customPlaceholder")}
					placeholderTextColor={palette.textSecondary}
					value={custom}
					onChangeText={setCustom}
					style={
						{
							flex: 1,
							fontFamily: FONT_FAMILY,
							fontSize: 14,
							color: palette.text,
							borderWidth: 1,
							borderColor: palette.border,
							borderRadius: 4,
							paddingHorizontal: 8,
							paddingVertical: 6,
							outlineStyle: "none",
						} as object
					}
				/>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("due.setCustom")}
					accessibilityState={{ disabled: !valid }}
					disabled={!valid}
					onPress={() => {
						onChange(custom);
						setCustom("");
					}}
					style={{ paddingHorizontal: 12, paddingVertical: 6 }}
				>
					<AppText weight="600" style={{ color: valid ? palette.accent : palette.textSecondary }}>
						{t("due.set")}
					</AppText>
				</PressableSurface>
			</View>
			{day === null ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("due.remove")}
					onPress={() => onChange(null)}
					hoverColor={palette.surfaceHover}
					style={{ padding: 12 }}
				>
					<AppText tone="danger">{t("due.remove")}</AppText>
				</PressableSurface>
			)}
		</View>
	);
}
