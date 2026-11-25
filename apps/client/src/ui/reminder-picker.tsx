import { View } from "react-native";
import { DueDay } from "../domain/due-day";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { NativeDateInput } from "./native-date-input";
import { NativeTimeInput } from "./native-time-input";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export interface ReminderPickerProps {
	readonly at: string | null;
	readonly now: Date;
	readonly onChange: (at: Date | null) => void;
}

const MORNING = "09:00";
const EVENING = "18:00";

export function ReminderPicker({ at, now, onChange }: ReminderPickerProps) {
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const today = DueDay.fromDate(now);
	const current = at === null ? null : new Date(at);
	const day = current === null ? today : DueDay.fromDate(current);
	const time = current === null ? MORNING : ReminderTimes.timeOf(current);
	const options = [
		{ label: t("remind.laterToday"), when: ReminderTimes.combine(today, EVENING) },
		{ label: t("remind.tomorrow"), when: ReminderTimes.combine(DueDay.add(today, 1), MORNING) },
		{ label: t("remind.nextWeek"), when: ReminderTimes.combine(DueDay.nextWeek(today), MORNING) },
	].filter((option) => option.when.getTime() > now.getTime());
	return (
		<View accessibilityLabel={t("remind.options")}>
			{options.map((option) => (
				<PressableSurface
					key={option.label}
					accessibilityRole="button"
					accessibilityLabel={t("remind.option", { label: option.label })}
					onPress={() => onChange(option.when)}
					hoverColor={palette.surfaceHover}
					style={{ flexDirection: "row", justifyContent: "space-between", padding: 12 }}
				>
					<AppText>{option.label}</AppText>
					<AppText tone="secondary">{i18n.reminderLabel(option.when.toISOString())}</AppText>
				</PressableSurface>
			))}
			<View
				style={{
					flexDirection: "row",
					flexWrap: "wrap",
					alignItems: "center",
					gap: 8,
					padding: 12,
				}}
			>
				<NativeDateInput
					label={t("remind.custom")}
					value={current === null ? null : day}
					fallback={today}
					onChange={(chosen) => onChange(ReminderTimes.combine(chosen, time))}
				/>
				<NativeTimeInput
					label={t("remind.customTime")}
					value={time}
					onChange={(chosen) => onChange(ReminderTimes.combine(day, chosen))}
				/>
			</View>
			{current === null ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("remind.remove")}
					onPress={() => onChange(null)}
					hoverColor={palette.surfaceHover}
					style={{ padding: 12 }}
				>
					<AppText tone="danger">{t("remind.remove")}</AppText>
				</PressableSurface>
			)}
		</View>
	);
}

export class ReminderTimes {
	static combine(day: string, time: string): Date {
		const [hours, minutes] = time.split(":").map(Number);
		const date = DueDay.toLocalDate(day);
		date.setHours(hours!, minutes!, 0, 0);
		return date;
	}

	static timeOf(date: Date): string {
		return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
	}
}
