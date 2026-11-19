import { useSyncExternalStore } from "react";
import { useWindowDimensions } from "react-native";
import type { Observable } from "../state/observable";
import { Layout, type LayoutMode } from "./theme";

export function useObservable<T>(observable: Observable<T>): T {
	return useSyncExternalStore(observable.subscribe, () => observable.get());
}

export function useLayoutMode(): LayoutMode {
	return Layout.modeFor(useWindowDimensions().width);
}
