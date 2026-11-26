import { useEffect, useRef } from "react";
import { BackHandler, Platform } from "react-native";

export function useBackHandler(handle: () => boolean): void {
	const latest = useRef(handle);
	latest.current = handle;
	useEffect(() => {
		if (Platform.OS !== "android") {
			return;
		}
		const subscription = BackHandler.addEventListener("hardwareBackPress", () => latest.current());
		return () => subscription.remove();
	}, []);
}
