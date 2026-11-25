import { Image, View } from "react-native";
import type { AttachmentData } from "../attachments/attachment";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

const TILE = { width: 36, height: 40, borderRadius: 4 } as const;
const LONGEST_EXTENSION = 4;

export interface AttachmentRowProps {
	readonly file: AttachmentData;
	readonly onOpen: () => void;
	readonly onRemove: () => void;
}

function extensionOf(name: string): string {
	const dot = name.lastIndexOf(".");
	return dot > 0 ? name.slice(dot + 1, dot + 1 + LONGEST_EXTENSION).toUpperCase() : "";
}

function Thumbnail({ file }: { file: AttachmentData }) {
	const palette = useTheme();
	return (
		<View
			style={{
				...TILE,
				overflow: "hidden",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: palette.accent,
			}}
		>
			{file.contentType.startsWith("image/") ? (
				<Image source={{ uri: file.url }} resizeMode="cover" style={TILE} />
			) : (
				<AppText size={10} weight="600" tone="onAccent">
					{extensionOf(file.name)}
				</AppText>
			)}
		</View>
	);
}

export function AttachmentRow({ file, onOpen, onRemove }: AttachmentRowProps) {
	const palette = useTheme();
	const i18n = useI18n();
	const { t } = i18n;
	return (
		<View style={{ flexDirection: "row", alignItems: "center" }}>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("attachment.open", { name: file.name })}
				onPress={onOpen}
				hoverColor={palette.surfaceHover}
				style={{
					flex: 1,
					minWidth: 0,
					flexDirection: "row",
					alignItems: "center",
					paddingVertical: 8,
					paddingLeft: 10,
				}}
			>
				<Thumbnail file={file} />
				<View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
					<AppText size={14} tone="secondary" numberOfLines={1}>
						{file.name}
					</AppText>
					<AppText size={12} tone="secondary">
						{i18n.fileSize(file.size)}
					</AppText>
				</View>
			</PressableSurface>
			<PressableSurface
				accessibilityRole="button"
				accessibilityLabel={t("attachment.remove", { name: file.name })}
				onPress={onRemove}
				style={{ padding: 14 }}
			>
				<Icon glyph="close" size={16} color={palette.textSecondary} />
			</PressableSurface>
		</View>
	);
}
