import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Observable } from "../state/observable";
import { AppText } from "./app-text";
import { DialogKeys } from "./dialog-keys";
import { useObservable } from "./hooks";
import { PressableSurface } from "./pressable-surface";
import { useTheme } from "./theme-context";
import { useI18n } from "../i18n/i18n-context";

export interface ConfirmRequest {
	readonly title: string;
	readonly body: string;
	readonly confirmLabel: string;
	readonly cancelLabel?: string;
	readonly destructive?: boolean;
}

interface Pending {
	readonly request: ConfirmRequest;
	readonly resolve: (confirmed: boolean) => void;
}

export class ConfirmController extends Observable<Pending | null> {
	constructor() {
		super(null);
	}

	ask(request: ConfirmRequest): Promise<boolean> {
		return new Promise((resolve) => {
			this.set({ request, resolve });
		});
	}

	answer(confirmed: boolean): void {
		const pending = this.get();
		this.set(null);
		pending?.resolve(confirmed);
	}
}

const ConfirmContext = createContext<ConfirmController>(new ConfirmController());

export function useConfirm(): (request: ConfirmRequest) => Promise<boolean> {
	const controller = useContext(ConfirmContext);
	return (request) => controller.ask(request);
}

export function ConfirmHost({ children }: { children: ReactNode }) {
	const controller = useMemo(() => new ConfirmController(), []);
	const pending = useObservable(controller);
	const palette = useTheme();
	const { t } = useI18n();
	const keys = useMemo(
		() => ({
			accept: () => controller.answer(true),
			dismiss: () => controller.answer(false),
		}),
		[controller],
	);
	return (
		<ConfirmContext.Provider value={controller}>
			<View style={{ flex: 1 }}>
				{children}
				{pending === null ? null : (
					<View
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: 100,
							alignItems: "center",
							justifyContent: "center",
							backgroundColor: "rgba(0, 0, 0, 0.45)",
						}}
					>
						<Pressable
							accessibilityLabel={t("dialog.dismiss")}
							onPress={() => controller.answer(false)}
							style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
						/>
						<DialogKeys onAccept={keys.accept} onDismiss={keys.dismiss}>
							<View
								accessibilityRole="alert"
								accessibilityLabel={pending.request.title}
								style={{
									width: 360,
									padding: 24,
									borderRadius: 8,
									backgroundColor: palette.surface,
									borderWidth: 1,
									borderColor: palette.border,
								}}
							>
								<AppText size={17} weight="600">
									{pending.request.title}
								</AppText>
								<AppText tone="secondary" style={{ marginTop: 8 }}>
									{pending.request.body}
								</AppText>
								<View
									style={{
										flexDirection: "row",
										justifyContent: "flex-end",
										marginTop: 24,
										gap: 8,
									}}
								>
									<PressableSurface
										accessibilityRole="button"
										accessibilityLabel={pending.request.cancelLabel ?? t("dialog.cancel")}
										onPress={() => controller.answer(false)}
										hoverColor={palette.surfaceHover}
										style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 4 }}
									>
										<AppText weight="600">
											{pending.request.cancelLabel ?? t("dialog.cancel")}
										</AppText>
									</PressableSurface>
									<PressableSurface
										accessibilityRole="button"
										accessibilityLabel={pending.request.confirmLabel}
										onPress={() => controller.answer(true)}
										style={{
											paddingHorizontal: 16,
											paddingVertical: 8,
											borderRadius: 4,
											backgroundColor:
												pending.request.destructive === false ? palette.accent : palette.danger,
										}}
									>
										<AppText weight="600" tone="onAccent">
											{pending.request.confirmLabel}
										</AppText>
									</PressableSurface>
								</View>
							</View>
						</DialogKeys>
					</View>
				)}
			</View>
		</ConfirmContext.Provider>
	);
}
