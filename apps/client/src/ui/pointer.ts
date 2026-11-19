export interface PointerPosition {
	readonly x: number;
	readonly y: number;
}

export interface Modifiers {
	readonly shift: boolean;
	readonly toggle: boolean;
}

interface PointerEventLike {
	readonly clientX?: number;
	readonly clientY?: number;
	readonly shiftKey?: boolean;
	readonly ctrlKey?: boolean;
	readonly metaKey?: boolean;
	readonly preventDefault?: () => void;
	readonly nativeEvent?: {
		readonly pageX?: number;
		readonly pageY?: number;
		readonly shiftKey?: boolean;
		readonly ctrlKey?: boolean;
		readonly metaKey?: boolean;
	};
}

export class Pointer {
	static position(event: unknown): PointerPosition {
		const { clientX, clientY, nativeEvent } = event as PointerEventLike;
		return { x: clientX ?? nativeEvent?.pageX ?? 0, y: clientY ?? nativeEvent?.pageY ?? 0 };
	}

	static modifiers(event: unknown): Modifiers {
		const { shiftKey, ctrlKey, metaKey, nativeEvent } = event as PointerEventLike;
		return {
			shift: (shiftKey ?? nativeEvent?.shiftKey) === true,
			toggle:
				(ctrlKey ?? nativeEvent?.ctrlKey) === true || (metaKey ?? nativeEvent?.metaKey) === true,
		};
	}

	static suppressDefault(event: unknown): void {
		(event as PointerEventLike).preventDefault?.();
	}
}
