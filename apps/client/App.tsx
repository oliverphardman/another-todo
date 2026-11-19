import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DeviceLocale } from "./src/i18n/device-locale";
import { I18nProvider } from "./src/i18n/i18n-context";
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
	const locale = useMemo(() => DeviceLocale.resolved(), []);
	useEffect(() => {
		void Promise.all([container.database.load(), container.paneWidths.load()]).then(() =>
			container.auth.restore(),
		);
		container.sync.start();
		container.photos.start();
		container.realtime.start();
		const rollover = setInterval(() => container.store.refreshToday(), 60_000);
		return () => {
			clearInterval(rollover);
			container.sync.stop();
			container.photos.stop();
			container.realtime.stop();
		};
	}, [container]);
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<I18nProvider locale={locale}>
					<ContainerProvider container={container}>
						<AppShell providers={["Microsoft"]} />
					</ContainerProvider>
				</I18nProvider>
				<StatusBar style="auto" />
			</ThemeProvider>
		</SafeAreaProvider>
	);
}
