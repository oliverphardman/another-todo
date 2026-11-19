import { useState } from "react";
import { View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { Layout } from "./theme";
import { useTheme } from "./theme-context";
import { Sidebar } from "./sidebar";
import { SignInScreen } from "./sign-in-screen";
import { TaskDetailPane } from "./task-detail-pane";
import { TaskListPane } from "./task-list-pane";

export interface AppShellProps {
	readonly providers: readonly IdentityProvider[];
}

export function AppShell({ providers }: AppShellProps) {
	const { auth, store } = useContainer();
	const palette = useTheme();
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
				<AppText tone="onAccent">Loading…</AppText>
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
			return <TaskDetailPane task={task} onClose={closeDetail} />;
		}
		if (sidebarOpen) {
			return <Sidebar onSelected={() => setSidebarOpen(false)} />;
		}
		return <TaskListPane mode={mode} onShowSidebar={() => setSidebarOpen(true)} />;
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
				<TaskListPane mode={mode} />
			</View>
			{task === null ? null : (
				<View
					style={{
						width: Layout.detailWidth(mode),
						borderLeftWidth: 1,
						borderLeftColor: palette.border,
					}}
				>
					<TaskDetailPane task={task} onClose={closeDetail} />
				</View>
			)}
		</View>
	);
}
