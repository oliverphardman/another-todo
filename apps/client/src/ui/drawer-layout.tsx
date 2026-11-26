import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Keyboard, PanResponder, View } from "react-native";
import { useContainer } from "./container-context";
import { DrawerGesture, type Drag, type DrawerSide } from "./drawer-gesture";

export interface DrawerSpec {
	readonly open: boolean;
	readonly onChange: (open: boolean) => void;
	readonly content: ReactNode;
	readonly opensBySwipe?: boolean;
}

export interface DrawerLayoutProps {
	readonly width: number;
	readonly left: DrawerSpec;
	readonly right: DrawerSpec;
	readonly children: ReactNode;
}

const FILL = { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const;

class DrawerMotion {
	readonly progress: Animated.Value;
	readonly gesture: DrawerGesture;

	constructor(
		readonly side: DrawerSide,
		open: boolean,
	) {
		this.progress = new Animated.Value(open ? 1 : 0);
		this.gesture = new DrawerGesture(side);
	}

	settle(open: boolean, duration: number, done: () => void): void {
		if (duration === 0) {
			this.progress.setValue(open ? 1 : 0);
			done();
			return;
		}
		Animated.timing(this.progress, {
			toValue: open ? 1 : 0,
			duration,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start(({ finished }) => {
			if (finished) {
				done();
			}
		});
	}
}

function useDrawer(side: DrawerSide, spec: DrawerSpec) {
	const { motion } = useContainer();
	const [drawer] = useState(() => new DrawerMotion(side, spec.open));
	const [shown, setShown] = useState(spec.open);
	const [resting, setResting] = useState(spec.open);
	const previous = useRef(spec.open);
	if (spec.open && !shown) {
		setShown(true);
	}
	const settle = (open: boolean) =>
		drawer.settle(open, motion.slideMs, () => {
			setShown(open);
			setResting(open);
		});
	useEffect(() => {
		if (previous.current !== spec.open) {
			previous.current = spec.open;
			setResting(false);
			settle(spec.open);
		}
	}, [spec.open]);
	return {
		drawer,
		spec,
		shown: spec.open || shown,
		covering: spec.open && resting,
		reveal: () => setShown(true),
		settle,
	};
}

type DrawerHandle = ReturnType<typeof useDrawer>;

export function DrawerLayout({ width, left, right, children }: DrawerLayoutProps) {
	const lists = useDrawer("left", left);
	const details = useDrawer("right", right);
	const drawers = useRef({ lists, details });
	drawers.current = { lists, details };
	const dragged = useRef<DrawerHandle | null>(null);
	const span = useRef(width);
	span.current = width;
	const [responder] = useState(() => {
		const candidate = (): DrawerHandle => {
			const { lists, details } = drawers.current;
			return details.spec.open ? details : lists;
		};
		const claims = (_: unknown, drag: Drag) => {
			const target = candidate();
			const allowed = target.spec.open || target.spec.opensBySwipe === true;
			return allowed && target.drawer.gesture.claims(target.spec.open, drag);
		};
		const release = (drag: Drag | null) => {
			const target = dragged.current!;
			dragged.current = null;
			const open =
				drag === null ? target.spec.open : target.drawer.gesture.endsOpen(target.spec.open, drag);
			if (open === target.spec.open) {
				target.settle(open);
			} else {
				target.spec.onChange(open);
			}
		};
		return PanResponder.create({
			onMoveShouldSetPanResponder: claims,
			onMoveShouldSetPanResponderCapture: claims,
			onPanResponderGrant: () => {
				Keyboard.dismiss();
				dragged.current = candidate();
				dragged.current.reveal();
			},
			onPanResponderMove: (_, drag) => {
				const target = dragged.current!;
				target.drawer.progress.setValue(
					target.drawer.gesture.progress(target.spec.open, drag.dx, span.current),
				);
			},
			onPanResponderRelease: (_, drag) => release(drag),
			onPanResponderTerminate: () => release(null),
			onPanResponderTerminationRequest: () => false,
		});
	});
	const hidden = (covered: boolean) =>
		({
			"aria-hidden": covered,
			accessibilityElementsHidden: covered,
			importantForAccessibility: covered ? "no-hide-descendants" : "auto",
		}) as object;
	const panel = ({ drawer, shown, spec }: DrawerHandle, covered: boolean) =>
		shown ? (
			<Animated.View
				{...hidden(covered)}
				style={{
					...FILL,
					transform: [
						{
							translateX: drawer.progress.interpolate({
								inputRange: [0, 1],
								outputRange: [drawer.side === "left" ? -width : width, 0],
							}),
						},
					],
				}}
			>
				{spec.content}
			</Animated.View>
		) : null;
	return (
		<View style={{ flex: 1, overflow: "hidden" }} {...responder.panHandlers}>
			<View {...hidden(lists.covering || details.covering)} style={{ flex: 1 }}>
				{children}
			</View>
			{panel(lists, details.covering)}
			{panel(details, false)}
		</View>
	);
}
