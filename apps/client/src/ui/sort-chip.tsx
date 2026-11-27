import { SORT_OPTIONS } from "../domain/view-settings";
import { View } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { rowMetrics } from "./row-metrics";
import { useTheme } from "./theme-context";

const PILL = {
	flexDirection: "row",
	alignItems: "center",
	height: 36,
	borderRadius: 4,
	paddingHorizontal: 10,
	backgroundColor: "rgba(128, 128, 128, 0.22)",
} as const;

export function SortChip() {
	const { store, settings: preferences } = useContainer();
	const { rowStyle } = useObservable(preferences);
	const { t } = useI18n();
	const palette = useTheme();
	useObservable(store);
	const view = store.selectedView;
	const settings = store.settingsFor(view.id);
	const option = SORT_OPTIONS.find((candidate) => candidate.key === settings.sort);
	if (option === undefined) {
		return null;
	}
	return (
		<View
			style={{
				flexDirection: "row",
				paddingHorizontal: rowMetrics(rowStyle).listPadding,
				marginBottom: 12,
				gap: 8,
			}}
		>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("sort.flip")}
				aria-pressed={settings.sortDescending}
				onPress={() => store.updateSettings(view.id, { sortDescending: !settings.sortDescending })}
				style={PILL}
			>
				<AppText size={15} tone="onAccent" style={{ marginRight: 10 }}>
					{t("sort.chip", { sort: t(option.labelKey) })}
				</AppText>
				<Icon
					glyph={settings.sortDescending ? "chevronUp" : "chevronDown"}
					size={16}
					color={palette.onAccent}
				/>
			</PressableSurface>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("sort.clear")}
				onPress={() => store.updateSettings(view.id, { sort: null, sortDescending: false })}
				style={PILL}
			>
				<Icon glyph="close" size={16} color={palette.onAccent} />
			</PressableSurface>
		</View>
	);
}
