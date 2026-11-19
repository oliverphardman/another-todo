import { useEffect, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { THEME_COLORS, ViewDefaults, type ThemeSetting } from "../domain/view-settings";
import { ColorMath } from "./color-math";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useObservable } from "./hooks";
import { Icon } from "./icon";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

const SWATCH = 36;
const THUMBNAIL = 72;

export interface ThemePanelProps {
	readonly viewId: string;
	readonly onClose: () => void;
}

export function ThemePanel({ viewId, onClose }: ThemePanelProps) {
	const { store, photos } = useContainer();
	const palette = useTheme();
	useObservable(store);
	const library = useObservable(photos);
	const [confirming, setConfirming] = useState<string | null>(null);
	useEffect(() => {
		void photos.refresh();
	}, [photos]);
	const current = store.settingsFor(viewId).theme;
	const choose = (theme: ThemeSetting | null) => store.updateSettings(viewId, { theme });
	const defaultColor = ViewDefaults.themeColor(viewId);
	const selectedColor =
		current === null ? defaultColor : current.type === "color" ? current.color : null;
	const doomed = library.photos.find((photo) => photo.id === confirming);
	return (
		<ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ padding: 12 }}>
			<View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
				<AppText weight="600" size={15} style={{ flex: 1 }}>
					Theme
				</AppText>
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Close theme"
					onPress={onClose}
					style={{ padding: 4 }}
				>
					<Icon glyph="close" size={18} color={palette.textSecondary} />
				</PressableSurface>
			</View>
			<AppText size={12} tone="secondary" style={{ marginBottom: 8 }}>
				Colors
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
				{THEME_COLORS.map((color) => (
					<PressableSurface
						key={color.hex}
						accessibilityRole="radio"
						accessibilityLabel={`${color.name} theme`}
						aria-checked={selectedColor === color.hex}
						onPress={() =>
							choose(color.hex === defaultColor ? null : { type: "color", color: color.hex })
						}
						style={{
							width: SWATCH,
							height: SWATCH,
							borderRadius: SWATCH / 2,
							backgroundColor: color.hex,
							alignItems: "center",
							justifyContent: "center",
							borderWidth: selectedColor === color.hex ? 2 : 0,
							borderColor: palette.text,
						}}
					>
						{selectedColor === color.hex ? (
							<Icon glyph="check" size={18} color={ColorMath.readableOn(color.hex)} />
						) : null}
					</PressableSurface>
				))}
			</View>
			<AppText size={12} tone="secondary" style={{ marginBottom: 8 }}>
				Photos
			</AppText>
			<View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
				{library.photos.map((photo) => {
					const selected = current?.type === "photo" && current.photoId === photo.id;
					return (
						<View key={photo.id} style={{ width: THUMBNAIL, height: THUMBNAIL }}>
							<PressableSurface
								accessibilityRole="radio"
								accessibilityLabel={`Use photo ${photo.name}`}
								aria-checked={selected}
								onPress={() => choose({ type: "photo", photoId: photo.id })}
								style={{
									width: THUMBNAIL,
									height: THUMBNAIL,
									borderRadius: 6,
									overflow: "hidden",
									borderWidth: selected ? 2 : 0,
									borderColor: palette.accent,
								}}
							>
								<Image
									accessibilityLabel={photo.name}
									source={{ uri: photo.url }}
									style={{ width: "100%", height: "100%" }}
									resizeMode="cover"
								/>
							</PressableSurface>
							<PressableSurface
								accessibilityRole="button"
								accessibilityLabel={`Delete photo ${photo.name}`}
								onPress={() => setConfirming(photo.id)}
								style={{
									position: "absolute",
									top: 2,
									right: 2,
									width: 22,
									height: 22,
									borderRadius: 11,
									backgroundColor: "rgba(0, 0, 0, 0.6)",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Icon glyph="close" size={12} color="#ffffff" />
							</PressableSurface>
						</View>
					);
				})}
				<PressableSurface
					accessibilityRole="button"
					accessibilityLabel="Upload photo"
					accessibilityState={{ busy: library.busy === "uploading" }}
					disabled={library.busy === "uploading"}
					onPress={() => void photos.upload()}
					hoverColor={palette.surfaceHover}
					style={{
						width: THUMBNAIL,
						height: THUMBNAIL,
						borderRadius: 6,
						borderWidth: 1,
						borderColor: palette.border,
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<Icon glyph="plus" size={22} color={palette.accent} />
					<AppText size={11} tone="secondary">
						{library.busy === "uploading" ? "Uploading…" : "Upload"}
					</AppText>
				</PressableSurface>
			</View>
			{doomed === undefined ? null : (
				<View style={{ marginTop: 12 }}>
					<AppText
						size={13}
					>{`Delete ${doomed.name} permanently? Any list using it goes back to the default theme.`}</AppText>
					<View style={{ flexDirection: "row", marginTop: 8, gap: 8 }}>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel="Confirm delete photo"
							onPress={() => {
								setConfirming(null);
								void photos.remove(doomed.id);
							}}
							style={{
								paddingHorizontal: 12,
								paddingVertical: 6,
								borderRadius: 4,
								backgroundColor: palette.danger,
							}}
						>
							<AppText size={13} tone="onAccent" weight="600">
								Delete
							</AppText>
						</PressableSurface>
						<PressableSurface
							accessibilityRole="button"
							accessibilityLabel="Cancel delete photo"
							onPress={() => setConfirming(null)}
							style={{ paddingHorizontal: 12, paddingVertical: 6 }}
						>
							<AppText size={13}>Cancel</AppText>
						</PressableSurface>
					</View>
				</View>
			)}
			{library.error === null ? null : (
				<AppText size={13} tone="danger" accessibilityRole="alert" style={{ marginTop: 12 }}>
					{library.error}
				</AppText>
			)}
		</ScrollView>
	);
}
