import { useLayoutEffect, useRef } from "react";
import { Animated, Easing, View, type ViewStyle } from "react-native";
import { useContainer } from "./container-context";
import { CheckedCircle, Icon } from "./icon";
import { PressableSurface, type PressableSurfaceProps } from "./pressable-surface";
import { useTheme } from "./theme-context";

export const PRESSED_CIRCLE = { scale: 0.82, opacity: 0.6 } as const;

const NO_RETENTION = { top: 0, left: 0, bottom: 0, right: 0 } as const;

const IMMEDIATE_PRESS = { delayPressIn: 0 } as object;

const UNSELECTABLE = { cursor: "default", userSelect: "none" } as object;

export interface CheckCircleProps extends Pick<
	PressableSurfaceProps,
	"onContextMenu" | "onLongPress"
> {
	readonly identity: string;
	readonly completed: boolean;
	readonly label: string;
	readonly size: number;
	readonly strokeWidth: number;
	readonly onToggle: () => void;
	readonly style?: ViewStyle;
}

export function CheckCircle({
	identity,
	completed,
	label,
	size,
	strokeWidth,
	onToggle,
	style,
	...menu
}: CheckCircleProps) {
	const palette = useTheme();
	const { motion } = useContainer();
	const fill = useRef(new Animated.Value(completed ? 1 : 0)).current;
	const press = useRef(new Animated.Value(0)).current;
	const mark = useRef({ identity, ticked: completed });
	if (mark.current.identity !== identity) {
		mark.current = { identity, ticked: completed };
	}
	mark.current.ticked ||= completed;
	const shown = useRef({ identity, completed });
	useLayoutEffect(() => {
		const before = shown.current;
		shown.current = { identity, completed };
		const reused = before.identity !== identity;
		if (reused) {
			press.stopAnimation();
			press.setValue(0);
		}
		if (!reused && before.completed === completed) {
			return;
		}
		const toValue = completed ? 1 : 0;
		if (reused || motion.fillMs === 0) {
			fill.stopAnimation();
			fill.setValue(toValue);
			return;
		}
		Animated.timing(fill, {
			toValue,
			duration: motion.fillMs,
			easing: Easing.out(Easing.cubic),
			useNativeDriver: false,
		}).start();
	}, [identity, completed, motion.fillMs, fill, press]);
	const pressTo = (toValue: number) => {
		if (motion.pressMs === 0) {
			press.setValue(toValue);
			return;
		}
		Animated.timing(press, {
			toValue,
			duration: motion.pressMs,
			easing: Easing.out(Easing.quad),
			useNativeDriver: false,
		}).start();
	};
	const between = (value: Animated.Value, from: number, to: number) =>
		value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
	return (
		<PressableSurface
			{...menu}
			{...IMMEDIATE_PRESS}
			accessibilityRole="checkbox"
			accessibilityLabel={label}
			accessibilityState={{ checked: completed }}
			onPress={onToggle}
			onPressIn={() => pressTo(1)}
			onPressOut={() => pressTo(0)}
			pressRetentionOffset={NO_RETENTION}
			style={{ ...style, ...UNSELECTABLE }}
		>
			<Animated.View
				testID="check-circle"
				style={{
					opacity: between(press, 1, PRESSED_CIRCLE.opacity),
					transform: [{ scale: between(press, 1, PRESSED_CIRCLE.scale) }],
				}}
			>
				<View style={{ width: size, height: size }}>
					<Icon glyph="circle" size={size} strokeWidth={strokeWidth} color={palette.accent} />
					{mark.current.ticked ? (
						<Animated.View
							testID="check-circle-fill"
							style={{
								position: "absolute",
								opacity: fill.interpolate({
									inputRange: [0, 0.25, 1],
									outputRange: [0, 1, 1],
								}),
								transform: [{ scale: fill }],
							}}
						>
							<CheckedCircle size={size} color={palette.accent} />
						</Animated.View>
					) : null}
				</View>
			</Animated.View>
		</PressableSurface>
	);
}
