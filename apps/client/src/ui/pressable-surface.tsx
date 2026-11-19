import {
	Pressable,
	type PressableProps,
	type PressableStateCallbackType,
	type ViewStyle,
} from "react-native";

export interface PressableSurfaceProps extends Omit<PressableProps, "style"> {
	readonly style?: ViewStyle;
	readonly hoverColor?: string;
	readonly activeColor?: string;
	readonly onContextMenu?: (event: unknown) => void;
}

export type InteractionState = PressableStateCallbackType & { hovered?: boolean };

export function surfaceStyle(
	state: InteractionState,
	style: ViewStyle | undefined,
	hoverColor: string | undefined,
	activeColor: string | undefined,
): (ViewStyle | undefined)[] {
	const backgroundColor = state.pressed ? activeColor : state.hovered ? hoverColor : undefined;
	return [style, backgroundColor === undefined ? undefined : { backgroundColor }];
}

export function PressableSurface({
	style,
	hoverColor,
	activeColor,
	onContextMenu,
	...rest
}: PressableSurfaceProps) {
	return (
		<Pressable
			{...rest}
			{...(onContextMenu === undefined ? {} : ({ onContextMenu } as object))}
			style={(state: PressableStateCallbackType) =>
				surfaceStyle(state as InteractionState, style, hoverColor, activeColor)
			}
		/>
	);
}
