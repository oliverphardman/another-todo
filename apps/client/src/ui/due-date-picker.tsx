import { useI18n } from "../i18n/i18n-context";
import { View } from "react-native";
import { DueDay } from "../domain/due-day";
import { AppText } from "./app-text";
import { PressableSurface } from "./pressable-surface";
import { NativeDateInput } from "./native-date-input";
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
	const options = [
		{ label: t("due.today"), day: today },
		{ label: t("due.tomorrow"), day: DueDay.add(today, 1) },
		{ label: t("due.nextWeek"), day: DueDay.nextWeek(today) },
	];
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
				<NativeDateInput label={t("due.custom")} value={day} fallback={today} onChange={onChange} />
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
