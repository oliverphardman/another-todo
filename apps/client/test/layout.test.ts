import { describe, expect, it } from "vitest";
import { Layout } from "../src/ui/theme";

describe("Layout", () => {
	it("chooses a mode from the window width", () => {
		expect(Layout.modeFor(320)).toBe("compact");
		expect(Layout.modeFor(699)).toBe("compact");
		expect(Layout.modeFor(700)).toBe("medium");
		expect(Layout.modeFor(1099)).toBe("medium");
		expect(Layout.modeFor(1100)).toBe("expanded");
	});

	it("sizes the side panes by mode", () => {
		expect(Layout.sidebarWidth("expanded")).toBe(280);
		expect(Layout.sidebarWidth("medium")).toBe(240);
		expect(Layout.detailWidth("expanded")).toBe(320);
		expect(Layout.detailWidth("medium")).toBe(300);
	});
});
