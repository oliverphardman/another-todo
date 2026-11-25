import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (library: string, path: string) =>
	readFileSync(
		join(dirname(createRequire(import.meta.url).resolve(`${library}/package.json`)), path),
		"utf8",
	);

describe("macOS native patches", () => {
	it("lets SVG views draw themselves so icons appear", () => {
		expect(source("react-native-svg", "apple/Elements/RNSVGSvgView.mm")).toMatch(
			/- \(BOOL\)wantsUpdateLayer\s*\{\s*return NO;/,
		);
	});

	it("keeps the text editor inside the padding of a focused field", () => {
		expect(
			source("react-native-macos", "Libraries/Text/TextInput/Singleline/RCTUITextField.mm"),
		).toContain("editor.superview.frame = [self.cell titleRectForBounds:self.bounds];");
	});

	it("keeps clipped, shadowed views laid out from the top", () => {
		expect(
			source(
				"react-native-macos",
				"React/Fabric/Mounting/ComponentViews/View/RCTViewComponentView.mm",
			),
		).toContain("_containerView = [[RCTUIView alloc] initWithFrame:");
	});

	it("rechecks the multiline scrollbar once the field has a size", () => {
		expect(
			source("react-native-macos", "Libraries/Text/TextInput/Multiline/RCTWrappedTextView.m"),
		).toMatch(/- \(void\)layout\s*\{\s*\[super layout\];\s*\[_scrollView setHasVerticalScroller:/);
	});
});
