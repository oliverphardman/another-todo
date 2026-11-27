import { Image, type ImageSourcePropType } from "react-native";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export const THUMBNAIL = 72;

export interface PhotoTileProps {
	readonly name: string;
	readonly label: string;
	readonly source: ImageSourcePropType;
	readonly selected: boolean;
	readonly onPress: () => void;
}

export function PhotoTile({ name, label, source, selected, onPress }: PhotoTileProps) {
	const palette = useTheme();
	return (
		<PressableSurface
			accessibilityRole="radio"
			accessibilityLabel={label}
			aria-checked={selected}
			onPress={onPress}
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
				accessibilityLabel={name}
				source={source}
				style={{ width: "100%", height: "100%" }}
				resizeMode="cover"
			/>
		</PressableSurface>
	);
}
