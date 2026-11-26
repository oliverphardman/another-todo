import { StatusBar } from "expo-status-bar";
import { ColorMath } from "./color-math";
import { useInsets } from "./safe-area";

export function StatusBarTone({ foreground }: { foreground: string }) {
	const { top } = useInsets();
	if (top === 0) {
		return null;
	}
	return <StatusBar style={ColorMath.luminance(foreground) > 0.4 ? "light" : "dark"} />;
}
