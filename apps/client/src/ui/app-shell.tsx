import { useI18n } from "../i18n/i18n-context";
import { useState, type ReactNode } from "react";
import { View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { Layout } from "./theme";
import { ContextMenuHost } from "./context-menu";
import { ResizeHandle } from "./resize-handle";
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
	const { auth } = useContainer();
	const palette = useTheme();
	const { t } = useI18n();
	const status = useObservable(auth);
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
	return (
		<ContextMenuHost>
			<MainLayout />
		</ContextMenuHost>
	);
}

function MainLayout() {
	const { store, paneWidths } = useContainer();
	const palette = useTheme();
	useObservable(store);
	const widths = useObservable(paneWidths);
	const mode = useLayoutMode();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const task = store.selectedTask;
	const closeDetail = () => store.selectTask(null);
	const sidebarWidth = widths.sidebar ?? Layout.sidebarWidth(mode);
	const detailWidth = widths.detail ?? Layout.detailWidth(mode);
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
		<View style={{ flex: 1, flexDirection: "row" }}>
			<View style={{ width: sidebarWidth }}>
				<Sidebar onSelected={() => undefined} />
				<ResizeHandle
					side="right"
					width={sidebarWidth}
					labelKey="resize.sidebar"
					onResize={(width) => paneWidths.resize("sidebar", width)}
					onCommit={() => void paneWidths.save()}
					onReset={() => {
						paneWidths.reset("sidebar");
						void paneWidths.save();
					}}
				/>
			</View>
			<View style={{ flex: 1 }}>
				<ThemedArea>
					<TaskListPane mode={mode} />
				</ThemedArea>
			</View>
			{task === null ? null : (
				<View
					style={{
						width: detailWidth,
						borderLeftWidth: 1,
						borderLeftColor: palette.border,
					}}
				>
					<ResizeHandle
						side="left"
						width={detailWidth}
						labelKey="resize.detail"
						onResize={(width) => paneWidths.resize("detail", width)}
						onCommit={() => void paneWidths.save()}
						onReset={() => {
							paneWidths.reset("detail");
							void paneWidths.save();
						}}
					/>
					<ThemedArea>
						<TaskDetailPane task={task} onClose={closeDetail} />
					</ThemedArea>
				</View>
			)}
		</View>
	);
}
