import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Animated, Easing, Platform } from "react-native";

export interface MovingItem {
	readonly key: string;
	readonly estimatedHeight: number;
	readonly element: ReactNode;
}

export interface MovingListProps {
	readonly scope: string;
	readonly trigger: string;
	readonly raised: ReadonlySet<string>;
	readonly duration: number;
	readonly items: readonly MovingItem[];
}

interface Snapshot {
	readonly scope: string;
	readonly trigger: string;
	readonly positions: ReadonlyMap<string, number>;
}

export class ListPositions {
	static of(
		items: readonly MovingItem[],
		heights: ReadonlyMap<string, number>,
	): ReadonlyMap<string, number> {
		let top = 0;
		return new Map(
			items.map((item) => {
				const position = [item.key, top] as const;
				top += heights.get(item.key) ?? item.estimatedHeight;
				return position;
			}),
		);
	}
}

const NATIVE_DRIVER = ["ios", "android"];

export function MovingList({ scope, trigger, raised, duration, items }: MovingListProps) {
	const heights = useRef(new Map<string, number>()).current;
	const offsets = useRef(new Map<string, Animated.Value>()).current;
	const previous = useRef<Snapshot | null>(null);
	const offsetFor = (key: string): Animated.Value => {
		const existing = offsets.get(key);
		if (existing !== undefined) {
			return existing;
		}
		const created = new Animated.Value(0);
		offsets.set(key, created);
		return created;
	};
	useLayoutEffect(() => {
		const before = previous.current;
		const positions = ListPositions.of(items, heights);
		previous.current = { scope, trigger, positions };
		if (duration === 0 || before?.scope !== scope || before.trigger === trigger) {
			return;
		}
		for (const [key, position] of positions) {
			const from = before.positions.get(key);
			if (from === undefined || from === position) {
				continue;
			}
			const offset = offsetFor(key);
			offset.setValue(from - position);
			Animated.timing(offset, {
				toValue: 0,
				duration,
				easing: Easing.out(Easing.cubic),
				useNativeDriver: NATIVE_DRIVER.includes(Platform.OS),
			}).start();
		}
	});
	return items.map((item) => (
		<Animated.View
			key={item.key}
			onLayout={(event) => heights.set(item.key, event.nativeEvent.layout.height)}
			style={{
				zIndex: raised.has(item.key) ? 1 : 0,
				transform: [{ translateY: offsetFor(item.key) }],
			}}
		>
			{item.element}
		</Animated.View>
	));
}
