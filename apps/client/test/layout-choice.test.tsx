import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { rowMetrics } from "../src/ui/row-metrics";
import { renderApp, type RenderOptions } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function start(options: RenderOptions = {}) {
	stop?.();
	cleanup();
	const app = await renderApp({ platform: "macos", ...options });
	stop = app.stop;
	return app;
}

const PROMPT = "Choose your layout style";

const radio = (name: string) => screen.getByRole("radio", { name });

const checked = (name: string) => radio(name).getAttribute("aria-checked");

const proceed = () =>
	act(async () => {
		fireEvent.click(screen.getByLabelText("Continue"));
	});

describe("choosing a layout on desktop", () => {
	it.each(["macos", "windows"])("comes between sign-in and the app on %s", async (platform) => {
		await start({ platform });
		expect(screen.getByRole("heading", { name: "Another To Do" })).toBeTruthy();
		expect(screen.getByText(PROMPT)).toBeTruthy();
		expect(screen.getByText(/Most familiar to Windows and web users/)).toBeTruthy();
		expect(screen.getByText(/Most familiar to macOS users/)).toBeTruthy();
		expect(screen.getByText("You can change this later in Settings.")).toBeTruthy();
		expect(screen.queryByLabelText("Add a task")).toBeNull();
	});

	it("shows an example of each style at its own size", async () => {
		await start();
		const heights = (name: string) =>
			Array.from(radio(name).querySelectorAll<HTMLElement>("[data-task-row]")).map(
				(row) => row.style.minHeight,
			);
		expect(heights("Cozy")).toEqual(Array(3).fill(`${rowMetrics("cozy").height}px`));
		expect(heights("Compact")).toEqual(Array(3).fill(`${rowMetrics("compact").height}px`));
	});

	it("saves the chosen style and opens the app", async () => {
		const app = await start();
		expect(checked("Cozy")).toBe("true");
		fireEvent.click(radio("Compact"));
		expect(checked("Compact")).toBe("true");
		expect(checked("Cozy")).toBe("false");
		expect(app.container.settings.get().rowStyle).toBe("cozy");
		await proceed();
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
		expect(app.container.settings.get().rowStyle).toBe("compact");
		expect(JSON.parse((await app.dataStore.get("atd.settings"))!)).toEqual({
			rowStyle: "compact",
		});
	});

	it("preselects the server's default and remembers accepting it", async () => {
		const app = await start({ config: { defaultSettings: { rowStyle: "compact" } } });
		expect(checked("Compact")).toBe("true");
		await proceed();
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
		expect(app.container.settings.rowStyleChosen).toBe(true);
	});

	it("is not asked again once a style has been chosen", async () => {
		await start({ saved: { "atd.settings": JSON.stringify({ rowStyle: "cozy" }) } });
		expect(screen.queryByText(PROMPT)).toBeNull();
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
	});

	it("waits until the person has signed in", async () => {
		const app = await start({ signedIn: false });
		expect(screen.getByLabelText("Sign in")).toBeTruthy();
		expect(screen.queryByText(PROMPT)).toBeNull();
		await act(async () => {
			await app.container.auth.signIn();
		});
		expect(screen.getByText(PROMPT)).toBeTruthy();
	});

	it("stacks the options only in a narrow window", async () => {
		const direction = () => screen.getByRole("radiogroup", { name: PROMPT }).style.flexDirection;
		await start({ width: 500 });
		expect(direction()).toBe("column");
		await start({ width: 1000 });
		expect(direction()).toBe("row");
	});

	it.each(["web", "ios", "android"])("is skipped on %s", async (platform) => {
		await start({ platform });
		expect(screen.queryByText(PROMPT)).toBeNull();
		expect(screen.getByLabelText("Add a task")).toBeTruthy();
	});
});
