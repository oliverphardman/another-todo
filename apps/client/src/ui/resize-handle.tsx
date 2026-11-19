import { useRef } from "react";
import { View } from "react-native";
import { useI18n } from "../i18n/i18n-context";
import type { MessageKey } from "../i18n/en-us";
import { Pointer } from "./pointer";
import { useTheme } from "./theme-context";

export interface ResizeHandleProps {
	readonly side: "left" | "right";
	readonly width: number;
	readonly labelKey: MessageKey;
	readonly onResize: (width: number) => void;
	readonly onCommit: () => void;
	readonly onReset: () => void;
}

const STEP = 16;

export function ResizeHandle({
	side,
	width,
	labelKey,
	onResize,
	onCommit,
	onReset,
}: ResizeHandleProps) {
	const { t } = useI18n();
	const palette = useTheme();
	const start = useRef({ x: 0, width: 0 });
	const begin = (event: unknown) => {
		Pointer.suppressDefault(event);
		start.current = { x: Pointer.position(event).x, width };
		const move = (moved: unknown) => {
			const delta = Pointer.position(moved).x - start.current.x;
			onResize(start.current.width + (side === "right" ? delta : -delta));
		};
		const end = () => {
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseup", end);
			onCommit();
		};
		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", end);
	};
	const key = (event: { key?: string }) => {
		const grow = side === "right" ? "ArrowRight" : "ArrowLeft";
		const shrink = side === "right" ? "ArrowLeft" : "ArrowRight";
		if (event.key === grow || event.key === shrink) {
			onResize(width + (event.key === grow ? STEP : -STEP));
			onCommit();
		}
	};
	const web = {
		onMouseDown: begin,
		onClick: (event: { detail?: number }) => {
			if (event.detail === 2) {
				onReset();
			}
		},
		onKeyDown: key,
		tabIndex: 0,
		role: "separator",
		"aria-orientation": "vertical",
		"aria-valuenow": width,
	};
	return (
		<View
			accessibilityLabel={t(labelKey)}
			{...(web as object)}
			style={
				{
					position: "absolute",
					top: 0,
					bottom: 0,
					[side === "right" ? "right" : "left"]: -3,
					width: 6,
					cursor: "col-resize",
					zIndex: 5,
					backgroundColor: "transparent",
					borderColor: palette.border,
				} as object
			}
		/>
	);
}
