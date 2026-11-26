import Svg, { Path } from "react-native-svg";

import { IconArtwork, type IconGlyph } from "./icon-artwork";

export type { IconGlyph } from "./icon-artwork";

export function CheckedCircle({
	size = 22,
	color,
}: {
	readonly size?: number;
	readonly color: string;
}) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path d={IconArtwork.path("circle").d} fill={color} stroke={color} strokeWidth={1.3} />
			<Path
				d="M7.8 12.4l3 3 5.4-5.8"
				stroke="#ffffff"
				strokeWidth={1.8}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
			/>
		</Svg>
	);
}

export interface IconProps {
	readonly glyph: IconGlyph;
	readonly size?: number;
	readonly color: string;
	readonly strokeWidth?: number;
}

export function Icon({ glyph, size = 20, color, strokeWidth = 1.6 }: IconProps) {
	const { d, fill = false } = IconArtwork.path(glyph);
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path
				d={d}
				stroke={color}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill={fill ? color : "none"}
			/>
		</Svg>
	);
}
