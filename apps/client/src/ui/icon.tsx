import Svg, { Path } from "react-native-svg";

export type IconGlyph =
	| "check"
	| "circle"
	| "star"
	| "starFilled"
	| "plus"
	| "calendar"
	| "home"
	| "all"
	| "list"
	| "menu"
	| "back"
	| "trash"
	| "close"
	| "chevronRight"
	| "chevronDown"
	| "signOut"
	| "cloudOff"
	| "sync";

const PATHS: Record<IconGlyph, { d: string; fill?: boolean }> = {
	circle: { d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" },
	check: {
		d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM7.8 12.4l3 3 5.4-5.8",
		fill: false,
	},
	star: {
		d: "M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z",
	},
	starFilled: {
		d: "M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z",
		fill: true,
	},
	plus: { d: "M12 5v14M5 12h14" },
	calendar: { d: "M5 5h14v15H5zM5 10h14M9 3v4M15 3v4" },
	home: { d: "M4 11l8-7 8 7M6 10v10h12V10" },
	all: { d: "M4 7h16M4 12h16M4 17h16" },
	list: { d: "M9 7h11M9 12h11M9 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01" },
	menu: { d: "M4 7h16M4 12h16M4 17h16" },
	back: { d: "M15 5l-7 7 7 7" },
	trash: { d: "M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v6M14 11v6" },
	close: { d: "M6 6l12 12M18 6L6 18" },
	chevronRight: { d: "M9 5l7 7-7 7" },
	chevronDown: { d: "M5 9l7 7 7-7" },
	signOut: { d: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9" },
	cloudOff: {
		d: "M3 3l18 18M7 18a4 4 0 0 1-.5-7.9A6 6 0 0 1 15 7M17.5 11A4 4 0 0 1 18 18H9",
	},
	sync: {
		d: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5",
	},
};

export interface IconProps {
	readonly glyph: IconGlyph;
	readonly size?: number;
	readonly color: string;
}

export function Icon({ glyph, size = 20, color }: IconProps) {
	const { d, fill = false } = PATHS[glyph];
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path
				d={d}
				stroke={color}
				strokeWidth={1.6}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill={fill ? color : "none"}
			/>
		</Svg>
	);
}
