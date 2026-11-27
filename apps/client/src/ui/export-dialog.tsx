import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import type { ExportFormatId } from "../export/export-format";
import { ListsSelection, ViewSelection, type ExportSelection } from "../export/export-selection";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { DialogKeys } from "./dialog-keys";
import type { ExportRequest } from "./export-host";
import { ExportListPicker } from "./export-list-picker";
import { useObservable } from "./hooks";
import { PressableSurface } from "./pressable-surface";
import { Checkbox, Choice } from "./settings-controls";
import { useTheme } from "./theme-context";
import { useBackHandler } from "./use-back-handler";

const WIDTH = 420;
const SURROUNDINGS = 260;
const SHORTEST = 120;
const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

export interface ExportDialogProps {
	readonly request: ExportRequest;
	readonly onClose: () => void;
}

export function ExportDialog({ request, onClose }: ExportDialogProps) {
	const { exporter, store } = useContainer();
	const i18n = useI18n();
	const { t } = i18n;
	const palette = useTheme();
	const window = useWindowDimensions();
	useObservable(store);
	const [format, setFormat] = useState<ExportFormatId>("csv");
	const [currentOnly, setCurrentOnly] = useState(true);
	const [selected, setSelected] = useState<ReadonlySet<string>>(new Set<string>());
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState(false);
	const choices = exporter.choices(i18n);
	const ids = choices.flatMap((entry) => entry.lists.map((list) => list.id));
	const choosing = request.view === null;
	const ready = !busy && (!choosing || ids.some((id) => selected.has(id)));
	const selection = (): ExportSelection => {
		if (request.view !== null && currentOnly) {
			return new ViewSelection(request.view);
		}
		return new ListsSelection(choosing ? selected : new Set(ids));
	};
	const run = () => {
		if (!ready) {
			return;
		}
		setBusy(true);
		setFailed(false);
		exporter
			.export(format, selection(), i18n)
			.then((outcome) => (outcome === "saved" ? onClose() : setBusy(false)))
			.catch(() => {
				setBusy(false);
				setFailed(true);
			});
	};
	const latest = useRef({ run, onClose });
	latest.current = { run, onClose };
	const keys = useMemo(
		() => ({
			accept: () => latest.current.run(),
			dismiss: () => latest.current.onClose(),
		}),
		[],
	);
	useBackHandler(() => {
		latest.current.onClose();
		return true;
	});
	return (
		<View
			style={{
				...FILL,
				zIndex: 50,
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: "rgba(0, 0, 0, 0.45)",
			}}
		>
			<Pressable accessibilityLabel={t("dialog.dismiss")} onPress={onClose} style={FILL} />
			<DialogKeys onAccept={keys.accept} onDismiss={keys.dismiss}>
				<View
					role="dialog"
					accessibilityLabel={t("export.title")}
					style={{
						width: Math.min(WIDTH, window.width * 0.9),
						padding: 24,
						borderRadius: 8,
						backgroundColor: palette.surface,
						borderWidth: 1,
						borderColor: palette.border,
					}}
				>
					<AppText role="heading" size={17} weight="600">
						{t("export.title")}
					</AppText>
					<Choice
						label={t("export.format")}
						value={format}
						options={exporter.formats.map((entry) => ({
							value: entry.id,
							label: t(entry.labelKey),
						}))}
						onChange={setFormat}
					/>
					{choosing ? (
						<ScrollView style={{ maxHeight: Math.max(SHORTEST, window.height - SURROUNDINGS) }}>
							<ExportListPicker choices={choices} selected={selected} onChange={setSelected} />
						</ScrollView>
					) : (
						<Checkbox
							label={t("export.currentOnly")}
							checked={currentOnly}
							onChange={setCurrentOnly}
						/>
					)}
					{failed ? (
						<AppText tone="danger" size={13} style={{ marginTop: 8 }}>
							{t("export.failed")}
						</AppText>
					) : null}
					<View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 24, gap: 8 }}>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("dialog.cancel")}
							onPress={onClose}
							hoverColor={palette.surfaceHover}
							style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 }}
						>
							<AppText weight="600">{t("dialog.cancel")}</AppText>
						</PressableSurface>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel={t("export.confirm")}
							accessibilityState={{ disabled: !ready, busy }}
							disabled={!ready}
							onPress={run}
							style={{
								paddingHorizontal: 16,
								paddingVertical: 8,
								borderRadius: 4,
								backgroundColor: palette.accent,
								opacity: ready ? 1 : 0.45,
							}}
						>
							<AppText weight="600" tone="onAccent">
								{t("export.confirm")}
							</AppText>
						</PressableSurface>
					</View>
				</View>
			</DialogKeys>
		</View>
	);
}
