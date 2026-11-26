import { View } from "react-native";
import { Task } from "../domain/task";
import { useI18n } from "../i18n/i18n-context";
import { OPTIONAL_LISTS } from "../state/app-settings";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { PressableSurface } from "./pressable-surface";
import { Checkbox, Choice, NumberField, SettingsSection } from "./settings-controls";
import { useAccountAction, useMicrosoftSettings, type SyncDirectionKey } from "./settings-state";
import { TaskRow } from "./task-row";
import { TextField } from "./text-field";
import { fontStyle } from "./typeface";
import { useTheme } from "./theme-context";

export function AppearanceSection() {
	const { settings } = useContainer();
	const { t } = useI18n();
	const { rowStyle, addTaskPosition } = useObservable(settings);
	return (
		<SettingsSection title={t("settings.appearance")}>
			<Choice
				label={t("settings.rowStyle")}
				value={rowStyle}
				options={[
					{ value: "cozy", label: t("settings.rowCozy") },
					{ value: "compact", label: t("settings.rowCompact") },
				]}
				onChange={(next) => settings.change({ rowStyle: next })}
			/>
			<RowPreview />
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

const ignore = () => undefined;

function RowPreview() {
	const { settings, store } = useContainer();
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const { rowStyle } = useObservable(settings);
	const example = Task.create("settings-preview", t("settings.previewTask"), "");
	const subtitle = [{ text: t("view.tasks") }, { text: i18n.dueLabel(store.today, store.today) }];
	return (
		<View
			accessibilityLabel={t("settings.preview")}
			pointerEvents="none"
			style={{ padding: 8, borderRadius: 6, backgroundColor: palette.background }}
		>
			<View aria-hidden importantForAccessibility="no-hide-descendants">
				<TaskRow
					task={example}
					subtitle={subtitle}
					overdue={false}
					selected={false}
					rowStyle={rowStyle}
					onToggleCompleted={ignore}
					onToggleImportant={ignore}
					onSelect={ignore}
					marker={null}
					onDragStart={null}
					buildMenu={() => []}
				/>
			</View>
		</View>
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
