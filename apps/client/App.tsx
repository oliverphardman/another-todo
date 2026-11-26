import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo } from "react";
import { Platform } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DeviceLocale } from "./src/i18n/device-locale";
import { I18nProvider } from "./src/i18n/i18n-context";
import { AppConfigReader, type AppConfig } from "./src/config/app-config";
import { ServerSession, ServerSessions } from "./src/config/server-session";
import { createContainer } from "./src/container";
import { AsyncStorageKeyValueStore } from "./src/storage/async-storage-key-value-store";
import { createTokenStore } from "./src/storage/token-store";
import { AboutSync } from "./src/ui/about-sync";
import { ContainerProvider } from "./src/ui/container-context";
import { KeyboardDismisser } from "./src/ui/keyboard-dismisser";
import { NativeSettingsPlaceholder } from "./src/ui/native-settings-sync";
import { AppShell } from "./src/ui/app-shell";
import { ServerGate } from "./src/ui/server-gate";
import { ThemeProvider } from "./src/ui/theme-context";

function createSession(): ServerSession {
	return ServerSessions.create(
		AppConfigReader.read(process.env),
		new AsyncStorageKeyValueStore(),
		createTokenStore(Platform.OS),
	);
}

function Application({ config, session }: { config: AppConfig; session: ServerSession }) {
	const container = useMemo(
		() => createContainer(config, { platform: Platform.OS, server: session }),
		[config, session],
	);
	useEffect(() => {
		void Promise.all([
			container.database.load(),
			container.paneWidths.load(),
			container.settings.load(),
		]).then(() => container.auth.restore());
		container.sync.start();
		container.photos.start();
		container.realtime.start();
		void container.reminders.start();
		const unwatchMicrosoft = container.microsoft.watch();
		const rollover = setInterval(() => container.store.refreshToday(), 60_000);
		return () => {
			clearInterval(rollover);
			container.sync.stop();
			container.photos.stop();
			container.realtime.stop();
			container.reminders.stop();
			unwatchMicrosoft();
			container.microsoft.stop();
		};
	}, [container]);
	return (
		<ContainerProvider container={container}>
			<AppShell providers={config.providers} />
		</ContainerProvider>
	);
}

export default function App() {
	const session = useMemo(createSession, []);
	const locale = useMemo(() => DeviceLocale.resolved(), []);
	useEffect(() => {
		void session.start();
	}, [session]);
	return (
		<SafeAreaProvider>
			<ThemeProvider>
				<StatusBar style="auto" />
				<I18nProvider locale={locale}>
					<AboutSync session={session} />
					<NativeSettingsPlaceholder />
					<KeyboardDismisser>
						<ServerGate session={session}>
							{(config) => <Application config={config} session={session} />}
						</ServerGate>
					</KeyboardDismisser>
				</I18nProvider>
			</ThemeProvider>
		</SafeAreaProvider>
	);
}
