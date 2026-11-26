import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Platform, Text } from "react-native";
import { afterEach, describe, expect, it } from "vitest";
import { I18n } from "../src/i18n/i18n";
import { Hint } from "../src/ui/hint";
import { renderApp } from "./support/render-app";

const original = Platform.OS;
let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
	Platform.OS = original;
});

describe("Hint", () => {
	it("follows its text on the web", () => {
		Platform.OS = "web";
		const view = render(
			<Hint text="One">
				<Text>Label</Text>
			</Hint>,
		);
		const hint = () => screen.getByText("Label").parentElement!;
		expect(hint().title).toBe("One");
		view.rerender(
			<Hint text="Two">
				<Text>Label</Text>
			</Hint>,
		);
		expect(hint().title).toBe("Two");
	});

	it("leaves the tooltip to the native view elsewhere", () => {
		Platform.OS = "macos";
		render(
			<Hint text="One">
				<Text>Label</Text>
			</Hint>,
		);
		expect(screen.getByText("Label").parentElement!.title).toBe("");
	});
});

describe("the created line", () => {
	it("shows the exact date and time on hover", async () => {
		const app = await renderApp();
		stop = app.stop;
		act(() => {
			app.connectivity.setOnline(false);
			app.container.store.addTask("Timed");
		});
		fireEvent.click(screen.getByLabelText("Open Timed"));
		const created = app.container.store.get().tasks[0]!.createdAt;
		const line = screen.getByText("Created a few moments ago");
		expect(line.parentElement!.title).toBe(new I18n("en-US").exactTime(created));
	});

	it("writes the exact time in the reader's locale, to the second", () => {
		const iso = new Date(2026, 10, 19, 14, 5, 9).toISOString();
		expect(new I18n("en-US").exactTime(iso)).toBe("Thursday, November 19, 2026 at 2:05:09 PM");
		expect(new I18n("en-GB").exactTime(iso)).toContain("19 November 2026");
		expect(new I18n("en-GB").exactTime(iso)).toContain("14:05:09");
	});
});
