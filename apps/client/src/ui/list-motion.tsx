import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Easing, Platform } from "react-native";
import { RowSlots } from "./row-slots";

export interface MovingItem {
	readonly key: string;
	readonly kind: "task" | "section";
	readonly estimatedHeight: number;
	readonly render: () => ReactNode;
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
		heightOf: (key: string) => number | undefined,
	): ReadonlyMap<string, number> {
		let top = 0;
		return new Map(
			items.map((item) => {
				const position = [item.key, top] as const;
				top += heightOf(item.key) ?? item.estimatedHeight;
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
	const [slots] = useState(() => new RowSlots());
	const assigned = slots.assign(scope, items);
	const slotOf = (key: string): string => assigned.get(key)!;
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
		const positions = ListPositions.of(items, (key) => heights.get(slotOf(key)));
		previous.current = { scope, trigger, positions };
		if (before !== null && before.scope !== scope) {
			offsets.forEach((offset) => offset.setValue(0));
		}
		if (duration === 0 || before?.scope !== scope || before.trigger === trigger) {
			return;
		}
		for (const [key, position] of positions) {
			const from = before.positions.get(key);
			if (from === undefined || from === position) {
				continue;
			}
			const offset = offsetFor(slotOf(key));
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
			key={slotOf(item.key)}
			onLayout={(event) => heights.set(slotOf(item.key), event.nativeEvent.layout.height)}
			style={{
				zIndex: raised.has(item.key) ? 1 : 0,
				transform: [{ translateY: offsetFor(slotOf(item.key)) }],
			}}
		>
			{item.render()}
		</Animated.View>
	));
}
