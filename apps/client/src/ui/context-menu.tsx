import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { Platform, Pressable, View, useWindowDimensions } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import { Observable } from "../state/observable";
import type { IconGlyph } from "./icon";
import { MenuItem, MenuPanel } from "./menu";
import { Pointer } from "./pointer";
import { useObservable } from "./hooks";
import { useTheme } from "./theme-context";

interface EntryBase {
	readonly key: string;
	readonly glyph: IconGlyph;
	readonly label: string;
	readonly separatorBefore?: boolean;
}

export type ContextMenuEntry =
	| (EntryBase & {
			readonly kind: "action";
			readonly onPress: () => void;
			readonly danger?: boolean;
			readonly disabled?: boolean;
	  })
	| (EntryBase & { readonly kind: "submenu"; readonly entries: readonly ContextMenuEntry[] })
	| (EntryBase & { readonly kind: "panel"; readonly render: (close: () => void) => ReactNode });

export interface ContextMenuState {
	readonly x: number;
	readonly y: number;
	readonly label: string;
	readonly entries: readonly ContextMenuEntry[];
}

export class ContextMenuController extends Observable<ContextMenuState | null> {
	constructor() {
		super(null);
	}

	open(state: ContextMenuState): void {
		this.set(state);
	}

	close(): void {
		this.set(null);
	}
}

const ContextMenuContext = createContext<ContextMenuController>(new ContextMenuController());

const WIDTH = 270;
const ROW = 40;
const MARGIN = 8;

export class MenuPlacement {
	static at(
		x: number,
		y: number,
		window: { readonly width: number; readonly height: number },
		entryCount: number,
	): { readonly left: number; readonly top: number } {
		return {
			left: Math.max(MARGIN, Math.min(x, window.width - WIDTH - MARGIN)),
			top: Math.max(MARGIN, Math.min(y, window.height - (entryCount * ROW + 16) - MARGIN)),
		};
	}
}

export interface ContextMenuTrigger {
	readonly onContextMenu: (event: unknown) => void;
	readonly onLongPress?: (event: unknown) => void;
}

export function useContextMenuTrigger(
	label: string,
	build: () => readonly ContextMenuEntry[],
): ContextMenuTrigger {
	const controller = useContext(ContextMenuContext);
	const show = (event: unknown) => {
		Pointer.suppressDefault(event);
		controller.open({ ...Pointer.position(event), label, entries: build() });
	};
	return { onContextMenu: show, onLongPress: Platform.OS === "web" ? undefined : show };
}

export function ContextMenuHost({ children }: { children: ReactNode }) {
	const controller = useMemo(() => new ContextMenuController(), []);
	const state = useObservable(controller);
	return (
		<ContextMenuContext.Provider value={controller}>
			<View style={{ flex: 1 }}>
				{children}
				{state === null ? null : (
					<ContextMenuPopup state={state} onClose={() => controller.close()} />
				)}
			</View>
		</ContextMenuContext.Provider>
	);
}

function ContextMenuPopup({ state, onClose }: { state: ContextMenuState; onClose: () => void }) {
	const { t } = useI18n();
	const palette = useTheme();
	const { width, height } = useWindowDimensions();
	const [stack, setStack] = useState<readonly ContextMenuEntry[][]>([[...state.entries]]);
	const [panel, setPanel] = useState<ContextMenuEntry | null>(null);
	const entries = stack[stack.length - 1]!;
	const { left, top } = MenuPlacement.at(state.x, state.y, { width, height }, entries.length);
	const finish = (action: () => void) => () => {
		action();
		onClose();
	};
	return (
		<View
			style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 }}
			accessibilityLabel={t("menu.overlay")}
		>
			<Pressable
				accessibilityLabel={t("menu.close")}
				onPress={onClose}
				{...({
					onContextMenu: (event: unknown) => {
						Pointer.suppressDefault(event);
						onClose();
					},
				} as object)}
				style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
			/>
			<MenuPanel label={state.label} placement={{ left, top, width: WIDTH }}>
				{panel !== null && panel.kind === "panel" ? (
					panel.render(onClose)
				) : (
					<>
						{stack.length > 1 ? (
							<MenuItem
								glyph="back"
								label={t("menu.back")}
								onPress={() => setStack(stack.slice(0, -1))}
							/>
						) : null}
						{entries.map((entry) => (
							<View key={entry.key}>
								{entry.separatorBefore === true ? (
									<View
										style={{
											height: 1,
											backgroundColor: palette.border,
											marginVertical: 4,
											marginHorizontal: 8,
										}}
									/>
								) : null}
								<MenuItem
									glyph={entry.glyph}
									label={entry.label}
									trailing={entry.kind === "submenu" ? "chevron" : undefined}
									danger={entry.kind === "action" && entry.danger === true}
									disabled={entry.kind === "action" && entry.disabled === true}
									onPress={
										entry.kind === "action"
											? finish(entry.onPress)
											: entry.kind === "submenu"
												? () => setStack([...stack, [...entry.entries]])
												: () => setPanel(entry)
									}
								/>
							</View>
						))}
					</>
				)}
			</MenuPanel>
		</View>
	);
}
