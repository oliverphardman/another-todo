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
	it("measures the resizable window, so focusing Settings keeps the main window's layout", () => {
		expect(source("react-native-macos", "React/CoreModules/RCTDeviceInfo.mm")).toContain(
			"(candidate.styleMask & NSWindowStyleMaskResizable) != 0",
		);
	});

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

	it("lets a single line field select its text when focused, as renaming does", () => {
		expect(
			source("react-native-macos", "Libraries/Text/TextInput/Singleline/RCTUITextField.mm"),
		).toMatch(/- \(void\)selectAll:\(id\)sender\s*\{\s*\[self selectText:sender\];/);
	});

	it("keeps a single line field on one line and scrolls long text", () => {
		const field = source(
			"react-native-macos",
			"Libraries/Text/TextInput/Singleline/RCTUITextField.mm",
		);
		expect(field).toContain("[self.cell setUsesSingleLineMode:YES];");
		expect(field).toContain("[self.cell setScrollable:YES];");
	});

	it("places the caret where a field is clicked, including its padding", () => {
		expect(
			source("react-native-macos", "Libraries/Text/TextInput/Singleline/RCTUITextField.mm"),
		).toMatch(/- \(void\)mouseDown:\(NSEvent \*\)event[\s\S]+?\[editor mouseDown:event\];/);
	});

	it("leaves the selection alone when an already focused field is focused again", () => {
		expect(
			source(
				"react-native-macos",
				"React/Fabric/Mounting/ComponentViews/TextInput/RCTTextInputComponentView.mm",
			),
		).toMatch(/currentEditor\] != nil\) \{\s*return;\s*\}\s*NSWindow \*window/);
	});

	it("lets a password field receive what is typed into it", () => {
		const field = source(
			"react-native-macos",
			"Libraries/Text/TextInput/Singleline/macOS/RCTUISecureTextField.mm",
		);
		expect(field).toContain(
			"return (_adoptingFieldEditor && aClass == NSSecureTextField.class) || [super isKindOfClass:aClass];",
		);
		expect(field.match(/adoptingFieldEditor = YES;/g)).toHaveLength(2);
		expect(field.match(/adoptingFieldEditor = NO;/g)).toHaveLength(2);
	});
});
