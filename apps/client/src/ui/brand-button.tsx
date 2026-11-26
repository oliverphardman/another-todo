import { AppText } from "./app-text";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";

export function BrandButton({ label, onPress }: { label: string; onPress: () => void }) {
	const palette = useTheme();
	return (
		<PressableSurface
			accessibilityRole="button"
			accessibilityLabel={label}
			onPress={onPress}
			style={{
				alignItems: "center",
				paddingVertical: 12,
				paddingHorizontal: 20,
				borderRadius: 4,
				marginTop: 12,
				minWidth: 260,
				backgroundColor: palette.surface,
			}}
		>
			<AppText weight="600" style={{ color: palette.accent }}>
				{label}
			</AppText>
		</PressableSurface>
	);
}
