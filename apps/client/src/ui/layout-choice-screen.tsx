import { useState, type ReactNode } from "react";
import { View } from "react-native";
import type { MessageKey } from "../i18n/en-us";
import { useI18n } from "../i18n/i18n-context";
import { LAYOUT_STYLES, type LayoutStyle } from "../state/app-settings";
import { AppText } from "./app-text";
import { BrandButton } from "./brand-button";
import { BrandIntro } from "./brand-intro";
import { CenteredScreen } from "./centered-screen";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { STYLE_LABELS } from "./layout-labels";
import { MenuPreview } from "./menu-preview";
import { PressableSurface } from "./pressable-surface";
import { RowPreview } from "./row-preview";
import { useTheme } from "./theme-context";

const CARD_WIDTH = 300;

interface LayoutStep {
	readonly key: "rowStyle" | "menuStyle";
	readonly prompt: MessageKey;
	readonly descriptions: Readonly<Record<LayoutStyle, MessageKey>>;
	readonly preview: (style: LayoutStyle, examples: readonly string[]) => ReactNode;
}

const TASK_STEP: LayoutStep = {
	key: "rowStyle",
	prompt: "layout.taskPrompt",
	descriptions: { cozy: "layout.taskCozy", compact: "layout.taskCompact" },
	preview: (style, examples) => <RowPreview rowStyle={style} titles={examples} />,
};

const MENU_STEP: LayoutStep = {
	key: "menuStyle",
	prompt: "layout.menuPrompt",
	descriptions: { cozy: "layout.menuCozy", compact: "layout.menuCompact" },
	preview: (style) => <MenuPreview menuStyle={style} />,
};

interface LayoutCardProps {
	readonly label: string;
	readonly description: string;
	readonly selected: boolean;
	readonly onSelect: () => void;
	readonly children: ReactNode;
}

function LayoutCard({ label, description, selected, onSelect, children }: LayoutCardProps) {
	const palette = useTheme();
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
				{children}
			</PressableSurface>
		</View>
	);
}

export function LayoutChoiceScreen() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { rowStyle, menuStyle } = useObservable(settings);
	const [chosen, setChosen] = useState({ rowStyle, menuStyle });
	const [step, setStep] = useState(TASK_STEP);
	const stacked = useLayoutMode() === "compact";
	const first = step === TASK_STEP;
	const examples = [t("layout.exampleFirst"), t("layout.exampleSecond"), t("layout.exampleThird")];
	return (
		<CenteredScreen>
			<BrandIntro animate={false}>
				<AppText tone="onAccent" style={{ marginBottom: 12, textAlign: "center" }}>
					{t(step.prompt)}
				</AppText>
				<View
					key={step.key}
					accessibilityRole="radiogroup"
					accessibilityLabel={t(step.prompt)}
					style={{ flexDirection: stacked ? "column" : "row", gap: 12 }}
				>
					{LAYOUT_STYLES.map((style) => (
						<LayoutCard
							key={style}
							label={t(STYLE_LABELS[style])}
							description={t(step.descriptions[style])}
							selected={chosen[step.key] === style}
							onSelect={() => setChosen({ ...chosen, [step.key]: style })}
						>
							{step.preview(style, examples)}
						</LayoutCard>
					))}
				</View>
				<BrandButton
					label={t("layout.continue")}
					onPress={() => (first ? setStep(MENU_STEP) : settings.change(chosen))}
				/>
				{first ? null : (
					<PressableSurface
						accessibilityRole="button"
						accessibilityLabel={t("layout.back")}
						onPress={() => setStep(TASK_STEP)}
						style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 }}
					>
						<AppText tone="onAccent" weight="600">
							{t("layout.back")}
						</AppText>
					</PressableSurface>
				)}
				<AppText size={13} tone="onAccent" style={{ marginTop: 16, textAlign: "center" }}>
					{t("layout.later")}
				</AppText>
			</BrandIntro>
		</CenteredScreen>
	);
}
