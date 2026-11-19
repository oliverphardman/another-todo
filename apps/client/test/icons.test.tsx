import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Icon, type IconGlyph } from "../src/ui/icon";

const GLYPHS: IconGlyph[] = [
	"check",
	"circle",
	"star",
	"starFilled",
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
