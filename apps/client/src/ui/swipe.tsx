import { useRef, type ReactNode } from "react";
import { View } from "react-native";
import { Pointer } from "./pointer";

export type SwipeDirection = "left" | "right";

export class SwipeDetector {
	static readonly DISTANCE = 60;

	static classify(dx: number, dy: number): SwipeDirection | null {
		if (Math.abs(dx) < SwipeDetector.DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) {
			return null;
		}
		return dx > 0 ? "right" : "left";
	}
}

export interface SwipeAreaProps {
	readonly onSwipe: (direction: SwipeDirection) => void;
	readonly children: ReactNode;
}

interface TouchLike {
	readonly touches?: readonly { readonly pageX: number; readonly pageY: number }[];
	readonly changedTouches?: readonly { readonly pageX: number; readonly pageY: number }[];
	readonly nativeEvent?: {
		readonly touches?: readonly { readonly pageX: number; readonly pageY: number }[];
		readonly changedTouches?: readonly { readonly pageX: number; readonly pageY: number }[];
	};
}

export function touchPoint(event: unknown, ended: boolean): { x: number; y: number } {
	const { touches, changedTouches, nativeEvent } = event as TouchLike;
	const list = ended
		? (changedTouches ?? nativeEvent?.changedTouches)
		: (touches ?? nativeEvent?.touches);
	const first = list?.[0];
	return first === undefined ? Pointer.position(event) : { x: first.pageX, y: first.pageY };
}

export function SwipeArea({ onSwipe, children }: SwipeAreaProps) {
	const origin = useRef({ x: 0, y: 0 });
	const handlers = {
		onTouchStart: (event: unknown) => {
			origin.current = touchPoint(event, false);
		},
		onTouchEnd: (event: unknown) => {
			const end = touchPoint(event, true);
			const direction = SwipeDetector.classify(end.x - origin.current.x, end.y - origin.current.y);
			if (direction !== null) {
				onSwipe(direction);
			}
		},
	};
	return (
		<View style={{ flex: 1 }} {...(handlers as object)}>
			{children}
		</View>
	);
}
