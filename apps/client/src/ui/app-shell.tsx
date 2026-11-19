import { useI18n } from "../i18n/i18n-context";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { Layout } from "./theme";
import { ThemeOverride, useTheme } from "./theme-context";
import { useListTheme } from "./use-list-theme";
import { Sidebar } from "./sidebar";
import { SignInScreen } from "./sign-in-screen";
import { TaskDetailPane } from "./task-detail-pane";
import { TaskListPane } from "./task-list-pane";

export interface AppShellProps {
	readonly providers: readonly IdentityProvider[];
}

function ThemedArea({ children }: { children: ReactNode }) {
	const { overrides } = useListTheme();
	return <ThemeOverride overrides={overrides}>{children}</ThemeOverride>;
}

export function AppShell({ providers }: AppShellProps) {
	const { auth, store } = useContainer();
	const palette = useTheme();
	const { t } = useI18n();
	const status = useObservable(auth);
	const state = useObservable(store);
	const mode = useLayoutMode();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	if (status === "loading") {
		return (
			<View
				style={{
					flex: 1,
					alignItems: "center",
					justifyContent: "center",
					backgroundColor: palette.background,
				}}
			>
				<AppText tone="onAccent">{t("app.loading")}</AppText>
			</View>
		);
	}
	if (status === "signedOut") {
		return <SignInScreen providers={providers} />;
	}
	const task = store.selectedTask;
	const closeDetail = () => store.selectTask(null);
	if (mode === "compact") {
		if (task !== null) {
			return (
				<ThemedArea>
					<TaskDetailPane task={task} onClose={closeDetail} />
				</ThemedArea>
			);
		}
		if (sidebarOpen) {
			return <Sidebar onSelected={() => setSidebarOpen(false)} />;
		}
		return (
			<ThemedArea>
				<TaskListPane mode={mode} onShowSidebar={() => setSidebarOpen(true)} />
			</ThemedArea>
		);
	}
	return (
		<View
			style={{ flex: 1, flexDirection: "row" }}
			accessibilityLabel={`Selected ${state.selectedViewId}`}
		>
			<View style={{ width: Layout.sidebarWidth(mode) }}>
				<Sidebar onSelected={() => undefined} />
			</View>
			<View style={{ flex: 1 }}>
				<ThemedArea>
					<TaskListPane mode={mode} />
				</ThemedArea>
			</View>
			{task === null ? null : (
				<View
					style={{
						width: Layout.detailWidth(mode),
						borderLeftWidth: 1,
						borderLeftColor: palette.border,
					}}
				>
					<ThemedArea>
						<TaskDetailPane task={task} onClose={closeDetail} />
					</ThemedArea>
				</View>
			)}
		</View>
	);
}
