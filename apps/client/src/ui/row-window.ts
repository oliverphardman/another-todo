import { useState } from "react";
import {
	useWindowDimensions,
	type LayoutChangeEvent,
	type NativeScrollEvent,
	type NativeSyntheticEvent,
} from "react-native";
import type { MovingItem } from "./list-motion";

const SPARE_ROWS = 2;

export class RowWindow {
	constructor(readonly pageSize: number) {}

	static covering(height: number, rowHeight: number): RowWindow {
		return new RowWindow(Math.ceil(height / rowHeight) + SPARE_ROWS);
	}

	slice(
		items: readonly MovingItem[],
		pages: number,
		kept: ReadonlySet<string>,
	): readonly MovingItem[] {
		const limit = pages * this.pageSize;
		return items.filter((item, index) => index < limit || kept.has(item.key));
	}

	static nearsEnd({ contentOffset, contentSize, layoutMeasurement }: NativeScrollEvent): boolean {
		const below = contentSize.height - contentOffset.y - layoutMeasurement.height;
		return contentOffset.y > 0 && below < layoutMeasurement.height;
	}
}

export function useRowWindow(
	scope: string,
	rowHeight: number,
	items: readonly MovingItem[],
	kept: ReadonlySet<string>,
) {
	const window = useWindowDimensions();
	const [viewport, setViewport] = useState(0);
	const [shown, setShown] = useState({ scope, pages: 1 });
	const pages = shown.scope === scope ? shown.pages : 1;
	if (shown.scope !== scope && shown.pages > 1) {
		setShown({ scope, pages });
	}
	const rows = RowWindow.covering(viewport || window.height, rowHeight);
	return {
		items: rows.slice(items, pages, kept),
		onLayout: ({ nativeEvent }: LayoutChangeEvent) => setViewport(nativeEvent.layout.height),
		onScroll: ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
			if (pages * rows.pageSize < items.length && RowWindow.nearsEnd(nativeEvent)) {
				setShown({ scope, pages: pages + 1 });
			}
		},
	};
}
