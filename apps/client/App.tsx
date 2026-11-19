import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppConfigReader } from "./src/config/app-config";
import { createContainer } from "./src/container";
import { ContainerProvider } from "./src/ui/container-context";
import { AppShell } from "./src/ui/app-shell";
import { ThemeProvider } from "./src/ui/theme-context";

export default function App() {
	const container = useMemo(
		() =>
			createContainer(AppConfigReader.read(process.env), {
				platform: Platform.OS,
			}),
		[],
	);
	useEffect(() => {
		void container.database.load().then(() => container.auth.restore());
		container.sync.start();
		container.photos.start();
		const rollover = setInterval(() => container.store.refreshToday(), 60_000);
		return () => {
			clearInterval(rollover);
			container.sync.stop();
			container.photos.stop();
		};
	}, [container]);
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<ContainerProvider container={container}>
					<AppShell providers={[]} />
				</ContainerProvider>
				<StatusBar style="auto" />
			</ThemeProvider>
		</SafeAreaProvider>
	);
}
