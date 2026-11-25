import { useState } from "react";
import { View } from "react-native";
import { CalendarMonth } from "../domain/calendar-month";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { Icon, type IconGlyph } from "./icon";
import type { NativeDateInputProps } from "./native-date-input";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

const CELL_HEIGHT = 28;
const MIN_WIDTH = 196;

export function DesktopDateInput(props: NativeDateInputProps) {
	return <Calendar key={props.value ?? props.fallback} {...props} />;
}

function Calendar({ label, value, fallback, onChange }: NativeDateInputProps) {
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const [month, setMonth] = useState(() => CalendarMonth.containing(value ?? fallback));
	const weeks = month.weeks(i18n.firstWeekday);
	return (
		<View accessibilityLabel={label} style={{ width: "100%", minWidth: MIN_WIDTH }}>
			<View style={{ flexDirection: "row", alignItems: "center" }}>
				<MonthButton
					glyph="back"
					label={t("calendar.previousMonth")}
					onPress={() => setMonth(month.previous())}
				/>
				<AppText weight="600" style={{ flex: 1, textAlign: "center" }}>
					{i18n.monthLabel(month.firstDay)}
				</AppText>
				<MonthButton
					glyph="chevronRight"
					label={t("calendar.nextMonth")}
					onPress={() => setMonth(month.next())}
				/>
			</View>
			<View style={{ flexDirection: "row" }}>
				{i18n.weekdayInitials().map((initial, index) => (
					<AppText
						key={index}
						size={12}
						tone="secondary"
						style={{ flex: 1, textAlign: "center", paddingVertical: 4 }}
					>
						{initial}
					</AppText>
				))}
			</View>
			{weeks.map((week, row) => (
				<View key={row} style={{ flexDirection: "row" }}>
					{week.map((day, column) =>
						day === null ? (
							<View key={column} style={{ flex: 1, height: CELL_HEIGHT }} />
						) : (
							<PressableSurface
								key={column}
								accessibilityRole="button"
								accessibilityLabel={i18n.longDay(day)}
								aria-selected={day === value}
								onPress={() => onChange(day)}
								hoverColor={palette.surfaceHover}
								style={{
									flex: 1,
									height: CELL_HEIGHT,
									alignItems: "center",
									justifyContent: "center",
									borderRadius: 4,
									borderWidth: 1,
									borderColor: day === fallback ? palette.accent : "transparent",
									...(day === value ? { backgroundColor: palette.accent } : {}),
								}}
							>
								<AppText size={12} tone={day === value ? "onAccent" : "primary"}>
									{Number(day.slice(8))}
								</AppText>
							</PressableSurface>
						),
					)}
				</View>
			))}
		</View>
	);
}

function MonthButton({
	glyph,
	label,
	onPress,
}: {
	glyph: IconGlyph;
	label: string;
	onPress: () => void;
}) {
	const palette = useTheme();
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			hoverColor={palette.surfaceHover}
			style={{ padding: 6, borderRadius: 4 }}
		>
			<Icon glyph={glyph} size={16} color={palette.textSecondary} />
		</PressableSurface>
	);
}
