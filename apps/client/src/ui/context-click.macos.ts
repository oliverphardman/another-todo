import type { ContextClickHandler } from "./context-click";

const SECONDARY_BUTTON = 2;

export function contextClickProps(handler: ContextClickHandler): object {
	return {
		onAuxClick: (event: { readonly nativeEvent: { readonly button: number } }) => {
			if (event.nativeEvent.button === SECONDARY_BUTTON) {
				handler(event);
			}
		},
	};
}
