import { View } from "react-native";
import { FREQUENCIES, Recurrence, type Frequency, type RepeatRule } from "../domain/recurrence";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export interface RepeatPickerProps {
	readonly repeat: RepeatRule | null;
	readonly day: string;
	readonly onChange: (repeat: RepeatRule | null) => void;
	readonly onDone: () => void;
}

export function RepeatPicker({ repeat, day, onChange, onDone }: RepeatPickerProps) {
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	const choose = (frequency: Frequency) => {
		if (repeat?.frequency !== frequency) {
			onChange(Recurrence.starting(frequency, day).rule);
		}
		if (frequency !== "weekly") {
			onDone();
		}
	};
	return (
		<View accessibilityLabel={t("repeat.options")}>
			{FREQUENCIES.map((frequency) => {
				const selected = repeat?.frequency === frequency;
				return (
					<View key={frequency}>
						<PressableSurface
							accessibilityRole="radio"
							accessibilityLabel={t(`repeat.${frequency}`)}
							{...({ "aria-checked": selected } as object)}
							onPress={() => choose(frequency)}
							hoverColor={palette.surfaceHover}
							style={{
								flexDirection: "row",
								alignItems: "center",
								justifyContent: "space-between",
								padding: 12,
							}}
						>
							<AppText>{t(`repeat.${frequency}`)}</AppText>
							{selected ? <Icon glyph="check" size={16} color={palette.accent} /> : null}
						</PressableSurface>
						{frequency === "weekly" && selected ? (
							<View
								accessibilityLabel={t("repeat.days")}
								style={{
									flexDirection: "row",
									flexWrap: "wrap",
									gap: 4,
									paddingHorizontal: 12,
									paddingBottom: 12,
								}}
							>
								{i18n.weekdays.map((weekday) => {
									const on = repeat.weekdays?.includes(weekday) === true;
									return (
										<PressableSurface
											key={weekday}
											accessibilityRole="checkbox"
											accessibilityLabel={i18n.longWeekday(weekday)}
											{...({ "aria-checked": on } as object)}
											onPress={() => onChange(new Recurrence(repeat).toggling(weekday).rule)}
											style={{
												minWidth: 32,
												height: 32,
												paddingHorizontal: 4,
												borderRadius: 16,
												borderWidth: 1,
												borderColor: on ? palette.accent : palette.border,
												backgroundColor: on ? palette.accent : "transparent",
												alignItems: "center",
												justifyContent: "center",
											}}
										>
											<AppText size={12} tone={on ? "onAccent" : "primary"}>
												{i18n.shortWeekday(weekday)}
											</AppText>
										</PressableSurface>
									);
								})}
							</View>
						) : null}
					</View>
				);
			})}
			{repeat === null ? null : (
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel={t("repeat.remove")}
					onPress={() => {
						onChange(null);
						onDone();
					}}
					hoverColor={palette.surfaceHover}
					style={{ padding: 12 }}
				>
					<AppText tone="danger">{t("repeat.remove")}</AppText>
				</PressableSurface>
			)}
		</View>
	);
}
