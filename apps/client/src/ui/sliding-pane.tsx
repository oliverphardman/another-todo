import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, View } from "react-native";
import { useContainer } from "./container-context";
import { usesNativeDriver } from "./native-driver";
import { useTheme } from "./theme-context";

export interface SlidingPaneProps {
	readonly open: boolean;
	readonly width: number;
	readonly children: ReactNode;
}

export function SlidingPane({ open, width, children }: SlidingPaneProps) {
	const { motion } = useContainer();
	const palette = useTheme();
	const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
	const [shown, setShown] = useState(open);
	const [settled, setSettled] = useState(open);
	const previous = useRef(open);
	if (open && !shown) {
		setShown(true);
	}
	if (!open && settled) {
		setSettled(false);
	}
	useEffect(() => {
		if (previous.current === open) {
			return;
		}
		previous.current = open;
		const rest = () => {
			setShown(open);
			setSettled(open);
		};
		if (motion.slideMs === 0) {
			progress.setValue(open ? 1 : 0);
			rest();
			return;
		}
		Animated.timing(progress, {
			toValue: open ? 1 : 0,
			duration: motion.slideMs,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: usesNativeDriver(),
		}).start(({ finished }) => {
			if (finished) {
				rest();
			}
		});
	}, [open, motion.slideMs, progress]);
	if (!open && !shown) {
		return null;
	}
	return (
		<>
			<View testID="sliding-pane-space" style={{ width: open && settled ? width : 0 }} />
			<Animated.View
				testID="sliding-pane"
				style={{
					position: "absolute",
					top: 0,
					bottom: 0,
					right: 0,
					width,
					borderLeftWidth: 1,
					borderLeftColor: palette.border,
					transform: [
						{
							translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }),
						},
					],
				}}
			>
				{children}
			</Animated.View>
		</>
	);
}
