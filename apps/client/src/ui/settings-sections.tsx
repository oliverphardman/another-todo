import { View } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { LAYOUT_STYLES, OPTIONAL_LISTS } from "../state/app-settings";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useExportActions } from "./export-host";
import { useObservable } from "./hooks";
import { STYLE_LABELS } from "./layout-labels";
import { MenuPreview } from "./menu-preview";
import { PressableSurface } from "./pressable-surface";
import { RowPreview } from "./row-preview";
import { Checkbox, Choice, NumberField, SettingsSection } from "./settings-controls";
import { useAccountAction, useMicrosoftSettings, type SyncDirectionKey } from "./settings-state";
import { TextField } from "./text-field";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export function GeneralSection() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { completionSound, confirmDelete } = useObservable(settings);
	return (
		<SettingsSection title={t("settings.general")}>
			<Checkbox
				label={t("settings.completionSound")}
				checked={completionSound}
				onChange={(next) => settings.change({ completionSound: next })}
			/>
			<Checkbox
				label={t("settings.confirmDelete")}
				checked={confirmDelete}
				onChange={(next) => settings.change({ confirmDelete: next })}
			/>
		</SettingsSection>
	);
}

export function AppearanceSection() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { rowStyle, menuStyle, addTaskPosition } = useObservable(settings);
	const styles = LAYOUT_STYLES.map((value) => ({ value, label: t(STYLE_LABELS[value]) }));
	return (
		<SettingsSection title={t("settings.appearance")}>
			<Choice
				label={t("settings.taskStyle")}
				value={rowStyle}
				options={styles}
				onChange={(next) => settings.change({ rowStyle: next })}
			/>
			<View accessibilityLabel={t("settings.taskPreview")}>
				<RowPreview rowStyle={rowStyle} titles={[t("settings.previewTask")]} />
			</View>
			<Choice
				label={t("settings.menuStyle")}
				value={menuStyle}
				options={styles}
				onChange={(next) => settings.change({ menuStyle: next })}
			/>
			<View accessibilityLabel={t("settings.menuPreview")}>
				<MenuPreview menuStyle={menuStyle} />
			</View>
			<Choice
				label={t("settings.addPosition")}
				value={addTaskPosition}
				options={[
					{ value: "top", label: t("settings.top") },
					{ value: "bottom", label: t("settings.bottom") },
				]}
				onChange={(next) => settings.change({ addTaskPosition: next })}
			/>
		</SettingsSection>
	);
}

export function MicrosoftSection() {
	const { t } = useI18n();
	const microsoft = useMicrosoftSettings();
	const disabled = !microsoft.enabled;
	const direction = (key: SyncDirectionKey, label: string) => (
		<Checkbox
			label={label}
			checked={microsoft[key]}
			disabled={disabled}
			onChange={(checked) => microsoft.setDirection(key, checked)}
		/>
	);
	return (
		<SettingsSection title={t("settings.microsoft")}>
			{microsoft.note === null ? null : (
				<AppText size={13} tone="secondary" style={{ marginBottom: 4 }}>
					{t(microsoft.note)}
				</AppText>
			)}
			{direction("receive", t("settings.msReceive"))}
			{direction("send", t("settings.msSend"))}
			<View
				style={{
					flexDirection: "row",
					alignItems: "center",
					paddingVertical: 8,
					opacity: disabled ? 0.45 : 1,
				}}
			>
				<AppText size={14}>{t("settings.msEvery")}</AppText>
				<NumberField
					label={t("settings.msInterval")}
					value={microsoft.intervalMinutes}
					disabled={disabled}
					onCommit={microsoft.setInterval}
				/>
				<AppText size={14}>{t("settings.msMinutes")}</AppText>
			</View>
		</SettingsSection>
	);
}

export function ServerSection() {
	const { config } = useContainer();
	const { t } = useI18n();
	const palette = useTheme();
	return (
		<SettingsSection title={t("settings.server")}>
			<AppText size={14} style={{ marginBottom: 6 }}>
				{t("settings.serverUrl")}
			</AppText>
			<TextField
				accessibilityLabel={t("settings.serverUrl")}
				editable={false}
				value={config.serverUrl}
				style={
					{
						paddingVertical: 8,
						paddingHorizontal: 10,
						borderRadius: 4,
						borderWidth: 1,
						borderColor: palette.border,
						backgroundColor: palette.surfaceHover,
						...fontStyle(),
						fontSize: 14,
						color: palette.textSecondary,
						outlineStyle: "none",
					} as object
				}
			/>
		</SettingsSection>
	);
}

export function ListsSection() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { lists } = useObservable(settings);
	return (
		<SettingsSection title={t("settings.lists")}>
			<AppText size={13} tone="secondary">
				{t("settings.showLists")}
			</AppText>
			{OPTIONAL_LISTS.map((list) => (
				<Checkbox
					key={list}
					label={t(`view.${list}`)}
					checked={lists[list]}
					onChange={(shown) => settings.showList(list, shown)}
				/>
			))}
		</SettingsSection>
	);
}

export function MyDaySection() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { myDay } = useObservable(settings);
	return (
		<SettingsSection title={t("settings.myDay")}>
			<Checkbox
				label={t("settings.yesterday")}
				hint={t("settings.yesterdayHint")}
				checked={myDay.yesterday}
				onChange={(yesterday) => settings.changeMyDay({ yesterday })}
			/>
			<Checkbox
				label={t("settings.dueToday")}
				checked={myDay.dueToday}
				onChange={(dueToday) => settings.changeMyDay({ dueToday })}
			/>
		</SettingsSection>
	);
}

export function ExportSection() {
	const { t } = useI18n();
	const palette = useTheme();
	const actions = useExportActions();
	if (actions === null) {
		return null;
	}
	return (
		<SettingsSection title={t("settings.export")}>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("settings.exportLists")}
				onPress={actions.exportLists}
				hoverColor={palette.surfaceHover}
				style={{
					alignSelf: "flex-start",
					paddingHorizontal: 16,
					paddingVertical: 8,
					borderRadius: 4,
					borderWidth: 1,
					borderColor: palette.border,
				}}
			>
				<AppText size={14} weight="600">
					{t("settings.exportLists")}
				</AppText>
			</PressableSurface>
		</SettingsSection>
	);
}

export function AccountSection() {
	const palette = useTheme();
	const action = useAccountAction();
	if (action === null) {
		return null;
	}
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={action.label}
			onPress={action.run}
			style={{
				marginTop: 32,
				paddingVertical: 10,
				alignItems: "center",
				borderRadius: 4,
				borderWidth: 1,
				borderColor: palette.danger,
			}}
		>
			<AppText size={14} weight="600" tone="danger">
				{action.label}
			</AppText>
		</PressableSurface>
	);
}
