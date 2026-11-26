import { cleanup, render, screen } from "@testing-library/react";
import { SafeAreaInsetsContext } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { CenteredScreen } from "../src/ui/centered-screen";
import { MenuPlacement } from "../src/ui/context-menu";
import { ConsumedInsets, SafeArea, useInsets } from "../src/ui/safe-area";
import { StatusBarTone } from "../src/ui/status-bar-tone";
import { ThemeProvider } from "../src/ui/theme-context";
import { renderApp, setViewport } from "./support/render-app";

const PHONE = { top: 44, right: 3, bottom: 34, left: 5 };
let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

function Report() {
	return <Text>{JSON.stringify(useInsets())}</Text>;
}

function onPhone(children: React.ReactNode) {
	return render(
		<SafeAreaInsetsContext.Provider value={PHONE}>
			<ThemeProvider scheme="light">{children}</ThemeProvider>
		</SafeAreaInsetsContext.Provider>,
	);
}

describe("safe areas", () => {
	it("are empty where the platform reports none", () => {
		render(<Report />);
		expect(screen.getByText('{"top":0,"right":0,"bottom":0,"left":0}')).toBeTruthy();
	});

	it("pad content away from the system bars", () => {
		const { container } = onPhone(
			<SafeArea>
				<View />
			</SafeArea>,
		);
		const area = container.firstElementChild as HTMLElement;
		expect([
			area.style.paddingTop,
			area.style.paddingRight,
			area.style.paddingBottom,
			area.style.paddingLeft,
		]).toEqual(["44px", "3px", "34px", "5px"]);
	});

	it("can be consumed by whatever already covers an edge", () => {
		onPhone(
			<ConsumedInsets edges={["top", "left"]}>
				<Report />
			</ConsumedInsets>,
		);
		expect(screen.getByText('{"top":0,"right":3,"bottom":34,"left":0}')).toBeTruthy();
	});

	it("keep centered screens clear of the bars with room to spare", () => {
		const { container } = onPhone(
			<CenteredScreen>
				<Text>Hello</Text>
			</CenteredScreen>,
		);
		const content = screen.getByText("Hello").parentElement!;
		expect(getComputedStyle(content).paddingTop).toBe("68px");
		expect(container.firstElementChild).toBeTruthy();
		expect(screen.getByText("Hello")).toBeTruthy();
	});

	it("keep menus clear of the bars", () => {
		const window = { width: 400, height: 800 };
		expect(MenuPlacement.at(0, 0, window, 2, PHONE)).toEqual({ left: 13, top: 52 });
		expect(MenuPlacement.at(999, 999, window, 2, PHONE)).toEqual({ left: 119, top: 662 });
	});
});

describe("the status bar", () => {
	it("is light over dark text colors and dark over light ones", () => {
		onPhone(<StatusBarTone foreground="#ffffff" />);
		expect(screen.getByTestId("status-bar").dataset.tone).toBe("light");
		cleanup();
		onPhone(<StatusBarTone foreground="#1b1a19" />);
		expect(screen.getByTestId("status-bar").dataset.tone).toBe("dark");
	});

	it("is left alone where nothing sits under it", () => {
		render(<StatusBarTone foreground="#ffffff" />);
		expect(screen.queryByTestId("status-bar")).toBeNull();
	});

	it("suits the demo banner while it covers the top, then the list", async () => {
		setViewport(400);
		const context = SafeAreaInsetsContext as unknown as { _currentValue: unknown };
		context._currentValue = PHONE;
		const app = await renderApp({ width: 400, config: { notice: "Public demo" } });
		stop = app.stop;
		const banner = screen.getByRole("alert");
		expect(banner.style.paddingTop).toBe("50px");
		expect(screen.getAllByTestId("status-bar").map((bar) => bar.dataset.tone)).toEqual(["dark"]);
		context._currentValue = null;
	});
});
