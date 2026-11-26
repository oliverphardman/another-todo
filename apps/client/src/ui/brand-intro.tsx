import { useEffect, useState, type ReactNode } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useI18n } from "../i18n/i18n-context";
import { AppText } from "./app-text";

export const INTRO_TIMING = { tileMs: 450, checkMs: 500, titleMs: 350, promptMs: 300 } as const;

const MARK = 96;
const CHECK = "M132 276L214 358L388 160";
const LONG_ARM = "M214 358L388 160";
const SHADED = "#bfcff0";

function Tile() {
	return (
		<Svg width={MARK} height={MARK} viewBox="0 0 512 512">
			<Defs>
				<LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
					<Stop offset="0" stopColor="#4a9cf8" />
					<Stop offset="1" stopColor="#1a55c2" />
				</LinearGradient>
			</Defs>
			<Rect width="512" height="512" rx="112" fill="url(#brand)" />
		</Svg>
	);
}

function Stroke({ d, color }: { d: string; color: string }) {
	return (
		<Path
			d={d}
			fill="none"
			stroke={color}
			strokeWidth={64}
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	);
}

function Check() {
	return (
		<Svg width={MARK} height={MARK} viewBox="0 0 512 512">
			<Stroke d={CHECK} color={SHADED} />
			<Stroke d={LONG_ARM} color="#ffffff" />
		</Svg>
	);
}

export interface BrandIntroProps {
	readonly children: ReactNode;
	readonly animate?: boolean;
}

export function BrandIntro({ children, animate = true }: BrandIntroProps) {
	const { t } = useI18n();
	const [done, setDone] = useState(!animate);
	const [steps] = useState(() => {
		const start = () => new Animated.Value(animate ? 0 : 1);
		return { tile: start(), check: start(), title: start(), prompt: start() };
	});
	useEffect(() => {
		if (!animate) {
			return;
		}
		const step = (value: Animated.Value, duration: number, easing: (at: number) => number) =>
			Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: false });
		const brand = Animated.sequence([
			step(steps.tile, INTRO_TIMING.tileMs, Easing.out(Easing.back(1.6))),
			step(steps.check, INTRO_TIMING.checkMs, Easing.out(Easing.back(2.2))),
			step(steps.title, INTRO_TIMING.titleMs, Easing.out(Easing.cubic)),
		]);
		brand.start(({ finished }) => {
			if (finished) {
				setDone(true);
				step(steps.prompt, INTRO_TIMING.promptMs, Easing.out(Easing.cubic)).start();
			}
		});
		return () => brand.stop();
	}, [animate, steps]);
	const between = (value: Animated.Value, from: number, to: number) =>
		value.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
	return (
		<View style={{ alignItems: "center" }}>
			<View
				accessibilityLabel={t("app.name")}
				accessibilityRole="image"
				style={{ width: MARK, height: MARK }}
			>
				<Animated.View
					style={{ opacity: steps.tile, transform: [{ scale: between(steps.tile, 0.4, 1) }] }}
				>
					<Tile />
				</Animated.View>
				<Animated.View
					style={{
						position: "absolute",
						opacity: steps.check,
						transform: [
							{ translateX: between(steps.check, -28, 0) },
							{ translateY: between(steps.check, -44, 0) },
							{ scale: between(steps.check, 1.7, 1) },
						],
					}}
				>
					<Check />
				</Animated.View>
			</View>
			<Animated.View
				style={{
					opacity: steps.title,
					transform: [{ translateY: between(steps.title, 12, 0) }],
					marginTop: 16,
				}}
			>
				<AppText role="heading" size={32} weight="600" tone="onAccent">
					{t("app.name")}
				</AppText>
			</Animated.View>
			<Animated.View
				key={done ? "ready" : "waiting"}
				{...(done ? {} : ({ "aria-hidden": true, accessibilityElementsHidden: true } as object))}
				pointerEvents={done ? "auto" : "none"}
				style={{ opacity: steps.prompt, alignItems: "center", marginTop: 24 }}
			>
				{done ? children : <View style={{ opacity: 0 }}>{children}</View>}
			</Animated.View>
		</View>
	);
}
