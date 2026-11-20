import { cleanup, fireEvent, screen } from "@testing-library/react";
import { Linking } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DemoHost } from "../src/config/demo-host";
import { renderApp } from "./support/render-app";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("DemoHost", () => {
	it("matches only the demo hostname", () => {
		expect(DemoHost.isActive({ hostname: "itsanothertodo.app" })).toBe(true);
		expect(DemoHost.isActive({ hostname: "api.itsanothertodo.app" })).toBe(false);
		expect(DemoHost.isActive({})).toBe(false);
		expect(DemoHost.isActive(undefined)).toBe(false);
		expect(DemoHost.isActive()).toBe(false);
	});
});

describe("demo banner", () => {
	it("is hidden away from the demo host", async () => {
		await renderApp();
		expect(screen.queryByLabelText("Dismiss demo notice")).toBeNull();
	});

	it("shows on the demo host, links to the source and can be dismissed locally", async () => {
		vi.stubGlobal("location", { hostname: "itsanothertodo.app" });
		const open = vi.spyOn(Linking, "openURL").mockResolvedValue(undefined);
		await renderApp();
		expect(screen.getByText(/This is a public demo/)).toBeTruthy();
		fireEvent.click(screen.getByText("Check out the source and host this yourself!"));
		expect(open).toHaveBeenCalledWith("https://github.com/oliverphardman/another-todo");
		fireEvent.click(screen.getByLabelText("Dismiss demo notice"));
		expect(screen.queryByText(/This is a public demo/)).toBeNull();
	});
});
