import Svg, { Path } from "react-native-svg";

export type IconGlyph =
	| "check"
	| "circle"
	| "sun"
	| "move"
	| "more"
	| "moreVertical"
	| "sort"
	| "palette"
	| "duplicate"
	| "print"
	| "arrowsUpDown"
	| "calendarPlus"
	| "bell"
	| "repeat"
	| "tag"
	| "paperclip"
	| "panelClose"
	| "calendarDots"
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
	| "syncOff";

const PATHS: Record<IconGlyph, { d: string; fill?: boolean }> = {
	circle: { d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z" },
	check: {
		d: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM7.8 12.4l3 3 5.4-5.8",
		fill: false,
	},
	sun: {
		d: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6",
	},
	bell: {
		d: "M12 3.5a5 5 0 0 0-5 5v3.2c0 .8-.3 1.5-.8 2.1L5 15.5h14l-1.2-1.7a3.4 3.4 0 0 1-.8-2.1V8.5a5 5 0 0 0-5-5zM10 18.5a2 2 0 0 0 4 0",
	},
	repeat: {
		d: "M5 11V9a3 3 0 0 1 3-3h10M15 3l3 3-3 3M19 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3",
	},
	tag: {
		d: "M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.6 7.6a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.6-7.6a1 1 0 0 1-.3-.7zM8 8h.01",
	},
	paperclip: {
		d: "M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.5 17.4a1.7 1.7 0 0 1-2.4-2.4l7.5-7.5",
	},
	panelClose: { d: "M4 5h16v14H4zM8.5 8.5v7M11.5 12h6M15 9.5l2.5 2.5-2.5 2.5" },
	calendarDots: {
		d: "M5 5h14v15H5zM5 9.5h14M9 13h.01M12 13h.01M15 13h.01M9 16.2h.01M12 16.2h.01M15 16.2h.01",
	},
	more: {
		d: "M4.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M10.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M16.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0",
		fill: true,
	},
	moreVertical: {
		d: "M10.5 5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M10.5 12a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0M10.5 19a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0",
		fill: true,
	},
	sort: { d: "M4 7h9M4 12h6M4 17h3M17 5v14M14 16l3 3 3-3" },
	palette: {
		d: "M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.5-1.9-.3-1 .3-2.1 1.5-2.1H17a3.5 3.5 0 0 0 3.5-3.5C20.5 6.7 16.7 3.5 12 3.5zM7.5 11h.01M10 7.5h.01M14 7.5h.01",
	},
	duplicate: { d: "M8 8h11v11H8zM5 15V5h10" },
	print: { d: "M7 9V4h10v5M7 17H5V9h14v8h-2M7 14h10v6H7z" },
	arrowsUpDown: { d: "M8 19V5M5 8l3-3 3 3M16 5v14M13 16l3 3 3-3" },
	calendarPlus: { d: "M5 5h14v15H5zM5 9.5h14M9 3v4M15 3v4M12 12.5v4M10 14.5h4" },
	move: { d: "M5 12h14M14 7l5 5-5 5" },
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
	syncOff: {
		d: "M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5M3 3l18 18",
	},
};

export function CheckedCircle({
	size = 22,
	color,
}: {
	readonly size?: number;
	readonly color: string;
}) {
	return (
		<Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
			<Path d={PATHS.circle.d} fill={color} stroke={color} strokeWidth={1.3} />
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
	const { d, fill = false } = PATHS[glyph];
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
