import { useState } from "react";
import { View } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import type { RowStyle } from "../state/app-settings";
import { AppText } from "./app-text";
import { BrandButton } from "./brand-button";
import { BrandIntro } from "./brand-intro";
import { CenteredScreen } from "./centered-screen";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { PressableSurface } from "./pressable-surface";
import { RowPreview } from "./row-preview";
import { useTheme } from "./theme-context";

const CARD_WIDTH = 300;

const CHOICES = [
	{ style: "cozy", label: "settings.rowCozy", description: "layout.cozy" },
	{ style: "compact", label: "settings.rowCompact", description: "layout.compact" },
] as const;

interface LayoutCardProps {
	readonly rowStyle: RowStyle;
	readonly label: string;
	readonly description: string;
	readonly selected: boolean;
	readonly onSelect: () => void;
}

function LayoutCard({ rowStyle, label, description, selected, onSelect }: LayoutCardProps) {
	const palette = useTheme();
	const { t } = useI18n();
	return (
		<View
			style={{
				padding: 3,
				borderRadius: 11,
				borderWidth: 3,
				borderColor: selected ? palette.onAccent : "transparent",
			}}
		>
			<PressableSurface
				accessibilityRole="radio"
				accessibilityLabel={label}
				accessibilityHint={description}
				accessibilityState={{ checked: selected }}
				aria-checked={selected}
				onPress={onSelect}
				style={{
					flexGrow: 1,
					width: CARD_WIDTH,
					padding: 12,
					borderRadius: 6,
					backgroundColor: palette.surface,
				}}
			>
				<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
					<View
						style={{
							width: 18,
							height: 18,
							borderRadius: 9,
							borderWidth: selected ? 5 : 1.5,
							borderColor: selected ? palette.accent : palette.textSecondary,
							marginRight: 8,
						}}
					/>
					<AppText size={16} weight="600">
						{label}
					</AppText>
				</View>
				<AppText size={13} tone="secondary" style={{ minHeight: 36, marginBottom: 10 }}>
					{description}
				</AppText>
				<RowPreview
					rowStyle={rowStyle}
					titles={[t("layout.exampleFirst"), t("layout.exampleSecond"), t("layout.exampleThird")]}
				/>
			</PressableSurface>
		</View>
	);
}

export function LayoutChoiceScreen() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { rowStyle } = useObservable(settings);
	const [chosen, setChosen] = useState(rowStyle);
	const stacked = useLayoutMode() === "compact";
	return (
		<CenteredScreen>
			<BrandIntro animate={false}>
				<AppText tone="onAccent" style={{ marginBottom: 12, textAlign: "center" }}>
					{t("layout.prompt")}
				</AppText>
				<View
					accessibilityRole="radiogroup"
					accessibilityLabel={t("layout.prompt")}
					style={{ flexDirection: stacked ? "column" : "row", gap: 12 }}
				>
					{CHOICES.map(({ style, label, description }) => (
						<LayoutCard
							key={style}
							rowStyle={style}
							label={t(label)}
							description={t(description)}
							selected={chosen === style}
							onSelect={() => setChosen(style)}
						/>
					))}
				</View>
				<BrandButton
					label={t("layout.continue")}
					onPress={() => settings.change({ rowStyle: chosen })}
				/>
				<AppText size={13} tone="onAccent" style={{ marginTop: 16, textAlign: "center" }}>
					{t("layout.later")}
				</AppText>
			</BrandIntro>
		</CenteredScreen>
	);
}
