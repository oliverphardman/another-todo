import { render, screen } from "@testing-library/react";
import { Platform } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../src/i18n/i18n-context";
import { PaneBackground } from "../src/ui/pane-background";
import { ThemeProvider } from "../src/ui/theme-context";

afterEach(() => {
	Platform.OS = "web";
});

const renderBackground = () =>
	render(
		<ThemeProvider scheme="light">
			<I18nProvider>
				<PaneBackground image={{ uri: "https://img.test/a.png" }}>
					<p>content</p>
				</PaneBackground>
			</I18nProvider>
		</ThemeProvider>,
	);

describe("PaneBackground", () => {
	it("pins the photo to the window on the web so it does not move when panes open", () => {
		renderBackground();
		const image = screen.getByLabelText("List background photo");
		expect(image.getAttribute("style") ?? "").toContain("fixed");
	});

	it("clips the fixed photo to its pane so it never covers the sidebar", () => {
		renderBackground();
		const pane = screen.getByLabelText("List background photo").parentElement!;
		expect(pane.getAttribute("style") ?? "").toContain("clip-path: inset(0");
	});

	it("sizes the photo to the window elsewhere", () => {
		Platform.OS = "ios";
		renderBackground();
		expect(screen.getByLabelText("List background photo")).toBeTruthy();
	});

	it("shows no photo when none is set", () => {
		render(
			<ThemeProvider scheme="light">
				<I18nProvider>
					<PaneBackground image={null}>
						<p>plain</p>
					</PaneBackground>
				</I18nProvider>
			</ThemeProvider>,
		);
		expect(screen.queryByLabelText("List background photo")).toBeNull();
	});
});
