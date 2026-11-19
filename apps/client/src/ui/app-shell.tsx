import { useI18n } from "../i18n/i18n-context";
import { useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { Layout } from "./theme";
import { ContextMenuHost } from "./context-menu";
import { ResizeHandle } from "./resize-handle";
import { SlidingPane } from "./sliding-pane";
import { SwipeArea } from "./swipe";
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
	useObservable(store);
	const widths = useObservable(paneWidths);
	const mode = useLayoutMode();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const task = store.selectedTask;
	const lastTask = useRef<Task | null>(null);
	if (task !== null) {
		lastTask.current = task;
	}
	const closeDetail = () => store.selectTask(null);
	const sidebarWidth = widths.sidebar ?? Layout.sidebarWidth(mode);
	const detailWidth = widths.detail ?? Layout.detailWidth(mode);
	if (mode === "compact") {
		if (task !== null) {
			return (
				<SwipeArea onSwipe={(direction) => direction === "right" && closeDetail()}>
					<ThemedArea>
						<TaskDetailPane task={task} onClose={closeDetail} />
					</ThemedArea>
				</SwipeArea>
			);
		}
		if (sidebarOpen) {
			return (
				<SwipeArea onSwipe={(direction) => direction === "left" && setSidebarOpen(false)}>
					<Sidebar onSelected={() => setSidebarOpen(false)} />
				</SwipeArea>
			);
		}
		return (
			<SwipeArea onSwipe={(direction) => direction === "right" && setSidebarOpen(true)}>
				<ThemedArea>
					<TaskListPane mode={mode} onShowSidebar={() => setSidebarOpen(true)} />
				</ThemedArea>
			</SwipeArea>
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
			<SlidingPane open={task !== null} width={detailWidth}>
				<ResizeHandle
					side="left"
					inset={0}
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
					{lastTask.current === null ? null : (
						<TaskDetailPane task={lastTask.current} onClose={closeDetail} />
					)}
				</ThemedArea>
			</SlidingPane>
		</View>
	);
}
