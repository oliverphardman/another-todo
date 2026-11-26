import { useEffect, useRef, type ReactNode } from "react";
import { Platform, View } from "react-native";

export function Hint({ text, children }: { readonly text: string; readonly children: ReactNode }) {
	const view = useRef<View>(null);
	useEffect(() => {
		if (Platform.OS === "web") {
			(view.current as unknown as { title: string }).title = text;
		}
	}, [text]);
	return (
		<View ref={view} collapsable={false} {...({ tooltip: text } as object)}>
			{children}
		</View>
	);
}
