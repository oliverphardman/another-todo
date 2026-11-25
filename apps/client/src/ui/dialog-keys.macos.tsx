import { useEffect, useRef, type ComponentRef } from "react";
import { codegenNativeCommands, View, type HostComponent } from "react-native";
import type { DialogKeysProps } from "./dialog-keys";

interface FocusCommands {
	focus(view: ComponentRef<HostComponent<object>>): void;
}

const HANDLED = [{ key: "Enter" }, { key: "Escape" }];

export function DialogKeys({ onAccept, onDismiss, children }: DialogKeysProps) {
	const scope = useRef<View>(null);
	useEffect(() => {
		codegenNativeCommands<FocusCommands>({ supportedCommands: ["focus"] }).focus(
			scope.current as unknown as ComponentRef<HostComponent<object>>,
		);
	}, []);
	const keys = {
		focusable: true,
		enableFocusRing: false,
		keyDownEvents: HANDLED,
		onKeyDown: (event: { readonly nativeEvent: { readonly key: string } }) => {
			if (event.nativeEvent.key === "Enter") {
				onAccept();
			} else if (event.nativeEvent.key === "Escape") {
				onDismiss();
			}
		},
	} as object;
	return (
		<View ref={scope} {...keys} style={{ maxWidth: "90%" }}>
			{children}
		</View>
	);
}
