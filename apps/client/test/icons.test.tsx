import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckedCircle, Icon, type IconGlyph } from "../src/ui/icon";
import { IconArtwork } from "../src/ui/icon-artwork";

const GLYPHS: IconGlyph[] = [
	"check",
	"circle",
	"star",
	"starFilled",
	"sun",
	"move",
	"rename",
	"settings",
	"tick",
	"note",
	"addPerson",
	"sync",
	"people",
	"group",
	"newGroup",
	"search",
	"chevronUp",
	"bell",
	"repeat",
	"tag",
	"paperclip",
	"panelClose",
	"calendarDots",
	"more",
	"moreVertical",
	"sort",
	"palette",
	"duplicate",
	"print",
	"arrowsUpDown",
	"calendarPlus",
	"dueDate",
	"createdDate",
	"plus",
	"calendar",
	"home",
	"all",
	"list",
	"menu",
	"back",
	"trash",
	"close",
	"chevronRight",
	"chevronDown",
	"signOut",
	"syncOff",
];

describe("CheckedCircle", () => {
	it("draws a filled circle with a white check", () => {
		const { container } = render(<CheckedCircle color="#6074c3" />);
		const paths = container.querySelectorAll("path");
		expect(paths).toHaveLength(2);
		expect(paths[0]!.getAttribute("d")).toContain("a9 9");
		expect(
			render(<CheckedCircle color="#000" size={30} />).container.querySelector("svg"),
		).toBeTruthy();
	});
});

describe("Icon", () => {
	it.each(GLYPHS)("draws %s", (glyph) => {
		const { container, unmount } = render(<Icon glyph={glyph} color="#000" />);
		expect(container.querySelector("path")?.getAttribute("d")?.length).toBeGreaterThan(0);
		unmount();
	});

	it("honors a custom size", () => {
		expect(
			render(<Icon glyph="plus" size={32} color="#000" />).container.querySelector("svg"),
		).toBeTruthy();
	});
});

describe("IconArtwork", () => {
	const parse = (markup: string) =>
		new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;

	it("draws the same outline as the on screen icon for native menus", () => {
		const svg = parse(IconArtwork.svg("trash"));
		const path = svg.querySelector("path")!;
		expect(svg.getAttribute("width")).toBe("16");
		expect(path.getAttribute("d")).toBe(IconArtwork.path("trash").d);
		expect(path.getAttribute("fill")).toBe("none");
		expect(path.getAttribute("stroke")).toBe("#000");
	});

	it("fills the solid glyphs", () => {
		expect(parse(IconArtwork.svg("starFilled")).querySelector("path")!.getAttribute("fill")).toBe(
			"#000",
		);
	});
});
