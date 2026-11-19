import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, View } from "react-native";
import { useContainer } from "./container-context";
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
	const [closing, setClosing] = useState(false);
	const previous = useRef(open);
	useEffect(() => {
		if (previous.current === open) {
			return;
		}
		previous.current = open;
		if (motion.slideMs === 0) {
			progress.setValue(open ? 1 : 0);
			setClosing(false);
			return;
		}
		setClosing(!open);
		Animated.timing(progress, {
			toValue: open ? 1 : 0,
			duration: motion.slideMs,
			useNativeDriver: false,
		}).start(({ finished }) => {
			if (finished && !open) {
				setClosing(false);
			}
		});
	}, [open, motion.slideMs, progress]);
	if (!open && !closing) {
		return null;
	}
	return (
		<Animated.View
			style={{
				width: progress.interpolate({ inputRange: [0, 1], outputRange: [0, width] }),
				overflow: "hidden",
				borderLeftWidth: 1,
				borderLeftColor: palette.border,
			}}
		>
			<View style={{ width, flex: 1 }}>{children}</View>
		</Animated.View>
	);
}
