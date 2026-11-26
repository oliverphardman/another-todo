import { useRef, useState } from "react";
import { PanResponder, Platform, type View } from "react-native";

const DRAG_SLOP = 4;

export interface Reorder {
	readonly id: string;
	readonly index: number;
	readonly offset: number;
}

export interface TouchReorderOptions {
	readonly siblingsOf: (id: string) => readonly string[];
	readonly onDrop: (id: string, index: number) => void;
}

interface Lift {
	readonly id: string;
	readonly centers: Map<string, number>;
	dragging: boolean;
	index: number;
}

export function useTouchReorder(options: TouchReorderOptions) {
	const enabled = Platform.OS === "ios" || Platform.OS === "android";
	const latest = useRef(options);
	latest.current = options;
	const rows = useRef(new Map<string, View>());
	const lift = useRef<Lift | null>(null);
	const [lifted, setLifted] = useState<string | null>(null);
	const [drag, setDrag] = useState<Reorder | null>(null);
	const [responder] = useState(() => {
		const claims = (_: unknown, gesture: { dy: number }) =>
			lift.current !== null && Math.abs(gesture.dy) > DRAG_SLOP;
		const finish = (drop: boolean) => {
			const held = lift.current!;
			lift.current = null;
			setLifted(null);
			setDrag(null);
			if (drop) {
				latest.current.onDrop(held.id, held.index);
			}
		};
		return PanResponder.create({
			onMoveShouldSetPanResponder: claims,
			onMoveShouldSetPanResponderCapture: claims,
			onPanResponderGrant: () => {
				lift.current!.dragging = true;
			},
			onPanResponderMove: (_, { dy }) => {
				const held = lift.current!;
				const at = held.centers.get(held.id)! + dy;
				held.index = latest.current
					.siblingsOf(held.id)
					.filter((id) => held.centers.get(id)! < at).length;
				setDrag({ id: held.id, index: held.index, offset: dy });
			},
			onPanResponderRelease: () => finish(true),
			onPanResponderTerminate: () => finish(false),
			onPanResponderTerminationRequest: () => false,
		});
	});
	return {
		enabled,
		lifted,
		drag,
		panHandlers: enabled ? responder.panHandlers : {},
		register: (id: string) => (row: View | null) => {
			if (row === null) {
				rows.current.delete(id);
			} else {
				rows.current.set(id, row);
			}
		},
		lift: (id: string) => {
			const centers = new Map<string, number>();
			for (const other of [id, ...latest.current.siblingsOf(id)]) {
				rows.current
					.get(other)
					?.measureInWindow((_x, y, _width, height) => centers.set(other, y + height / 2));
			}
			lift.current = { id, centers, dragging: false, index: 0 };
			setLifted(id);
		},
		release: (id: string): boolean => {
			if (lift.current?.id !== id || lift.current.dragging) {
				return false;
			}
			lift.current = null;
			setLifted(null);
			return true;
		},
	};
}
