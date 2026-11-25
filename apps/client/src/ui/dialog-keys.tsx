import { useEffect, useRef, type ReactNode } from "react";
import { View } from "react-native";

export interface DialogKeysProps {
	readonly onAccept: () => void;
	readonly onDismiss: () => void;
	readonly children: ReactNode;
}

interface Focusable {
	focus?(): void;
	contains?(target: unknown): boolean;
}

export function DialogKeys({ onAccept, onDismiss, children }: DialogKeysProps) {
	const scope = useRef<View>(null);
	useEffect(() => {
		if (typeof window.addEventListener !== "function") {
			return undefined;
		}
		const element = scope.current as unknown as Focusable;
		element.focus?.();
		const press = (event: KeyboardEvent) => {
			const onControl =
				event.target instanceof Node &&
				event.target !== element &&
				element.contains?.(event.target) === true;
			if (event.key === "Escape" || (event.key === "Enter" && !onControl)) {
				event.preventDefault();
				event.stopPropagation();
				(event.key === "Enter" ? onAccept : onDismiss)();
			}
		};
		window.addEventListener("keydown", press, true);
		return () => window.removeEventListener("keydown", press, true);
	}, [onAccept, onDismiss]);
	return (
		<View ref={scope} tabIndex={-1} style={{ maxWidth: "90%" }}>
			{children}
		</View>
	);
}
