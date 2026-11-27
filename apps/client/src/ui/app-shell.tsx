import { useI18n } from "../i18n/i18n-context";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Keyboard, useWindowDimensions, View } from "react-native";
import type { IdentityProvider } from "../auth/authorization-server";
import type { Task } from "../domain/task";
import { AppText } from "./app-text";
import { useContainer } from "./container-context";
import { useLayoutMode, useObservable } from "./hooks";
import { Layout } from "./theme";
import { ConfirmHost, useConfirm } from "./confirm";
import { ContextMenuHost } from "./context-menu";
import { MenuBarSync } from "./menu-bar-sync";
import { NativeSettingsSync } from "./native-settings-sync";
import { NoticeBanner } from "./notice-banner";
import { ResizeHandle } from "./resize-handle";
import { SettingsHost } from "./settings-host";
import { SlidingPane } from "./sliding-pane";
import { CenteredScreen } from "./centered-screen";
import { DrawerLayout } from "./drawer-layout";
import { KeyboardSafe } from "./keyboard-safe";
import { LayoutChoiceScreen } from "./layout-choice-screen";
import { ConsumedInsets } from "./safe-area";
import { ThemeOverride } from "./theme-context";
import { useBackHandler } from "./use-back-handler";
import { useListTheme } from "./use-list-theme";
import { Sidebar } from "./sidebar";
import { SignInScreen } from "./sign-in-screen";
import { TaskDetailPane } from "./task-detail-pane";
import { TaskListPane } from "./task-list-pane";

export interface AppShellProps {
	readonly providers: readonly IdentityProvider[];
}

const DESKTOP_PLATFORMS: readonly string[] = ["macos", "windows"];

function ThemedArea({ children }: { children: ReactNode }) {
	const { overrides } = useListTheme();
	return <ThemeOverride overrides={overrides}>{children}</ThemeOverride>;
}

export function AppShell({ providers }: AppShellProps) {
	const { auth, settings, platform } = useContainer();
	const { t } = useI18n();
	const status = useObservable(auth);
	useObservable(settings);
	if (status === "loading") {
		return (
			<CenteredScreen>
				<AppText tone="onAccent">{t("app.loading")}</AppText>
			</CenteredScreen>
		);
	}
	if (status === "signedOut") {
		return <SignInScreen providers={providers} />;
	}
	if (DESKTOP_PLATFORMS.includes(platform) && !settings.layoutChosen) {
		return <LayoutChoiceScreen />;
	}
	return (
		<ConfirmHost>
			<ContextMenuHost>
				<SettingsHost>
					<MenuBarSync />
					<NativeSettingsSync />
					<KeyboardSafe>
						<NoticeBanner>
							<MainLayout />
						</NoticeBanner>
					</KeyboardSafe>
				</SettingsHost>
			</ContextMenuHost>
		</ConfirmHost>
	);
}

function MainLayout() {
	const { store, paneWidths } = useContainer();
	useObservable(store);
	const widths = useObservable(paneWidths);
	const mode = useLayoutMode();
	const { width } = useWindowDimensions();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const showSidebar = (open: boolean) => {
		Keyboard.dismiss();
		setSidebarOpen(open);
	};
	const { microsoft } = useContainer();
	const microsoftStatus = useObservable(microsoft);
	const confirm = useConfirm();
	const { t } = useI18n();
	useEffect(() => {
		if (microsoftStatus === "offered") {
			void confirm({
				title: t("ms.consentTitle"),
				body: t("ms.consentBody"),
				confirmLabel: t("ms.consentConfirm"),
				cancelLabel: t("ms.consentDecline"),
				destructive: false,
			}).then((accepted) => (accepted ? microsoft.accept() : microsoft.decline()));
		}
	}, [microsoftStatus]);
	const task = store.selectedTask;
	const lastTask = useRef<Task | null>(null);
	if (task !== null) {
		lastTask.current = task;
	}
	const closeDetail = () => store.selectTask(null);
	useBackHandler(() => {
		if (task !== null) {
			closeDetail();
			return true;
		}
		if (mode === "compact" && sidebarOpen) {
			showSidebar(false);
			return true;
		}
		return false;
	});
	const sidebarWidth = widths.sidebar ?? Layout.sidebarWidth(mode);
	const detailWidth = widths.detail ?? Layout.detailWidth(mode);
	if (mode === "compact") {
		return (
			<DrawerLayout
				width={width}
				left={{
					open: sidebarOpen,
					onChange: showSidebar,
					opensBySwipe: true,
					content: <Sidebar onSelected={() => showSidebar(false)} />,
				}}
				right={{
					open: task !== null,
					onChange: closeDetail,
					content:
						lastTask.current === null ? null : (
							<ThemedArea>
								<TaskDetailPane task={lastTask.current} onClose={closeDetail} />
							</ThemedArea>
						),
				}}
			>
				<ThemedArea>
					<TaskListPane mode={mode} onShowSidebar={() => showSidebar(true)} />
				</ThemedArea>
			</DrawerLayout>
		);
	}
	return (
		<View style={{ flex: 1, flexDirection: "row" }}>
			<View style={{ width: sidebarWidth }}>
				<ConsumedInsets edges={["right"]}>
					<Sidebar onSelected={() => undefined} />
				</ConsumedInsets>
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
				<ConsumedInsets edges={task === null ? ["left"] : ["left", "right"]}>
					<ThemedArea>
						<TaskListPane mode={mode} />
					</ThemedArea>
				</ConsumedInsets>
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
				<ConsumedInsets edges={["left"]}>
					<ThemedArea>
						{lastTask.current === null ? null : (
							<TaskDetailPane task={lastTask.current} onClose={closeDetail} />
						)}
					</ThemedArea>
				</ConsumedInsets>
			</SlidingPane>
		</View>
	);
}
