import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckedCircle, Icon, type IconGlyph } from "../src/ui/icon";

const GLYPHS: IconGlyph[] = [
	"check",
	"circle",
	"star",
	"starFilled",
	"sun",
	"move",
	"edit",
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
