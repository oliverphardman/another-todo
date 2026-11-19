import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PaneWidths, PANE_LIMITS } from "../src/state/pane-widths";
import { MemoryKeyValueStore } from "../src/storage/key-value-store";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;
afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

describe("PaneWidths", () => {
	it("clamps, resets and persists widths", async () => {
		const storage = new MemoryKeyValueStore();
		const widths = new PaneWidths(storage);
		await widths.load();
		expect(widths.get()).toEqual({ sidebar: null, detail: null });
		widths.resize("sidebar", 10);
		widths.resize("detail", 9999);
		expect(widths.get()).toEqual({
			sidebar: PANE_LIMITS.sidebar.min,
			detail: PANE_LIMITS.detail.max,
		});
		await widths.save();
		const restored = new PaneWidths(storage);
		await restored.load();
		expect(restored.get()).toEqual(widths.get());
		restored.reset("sidebar");
		expect(restored.get().sidebar).toBeNull();
	});

	it("ignores corrupt or partial saved data", async () => {
		const storage = new MemoryKeyValueStore();
		await storage.set("atd.paneWidths", "not json");
		const widths = new PaneWidths(storage);
		await widths.load();
		expect(widths.get()).toEqual({ sidebar: null, detail: null });
		await storage.set("atd.paneWidths", JSON.stringify({ sidebar: "wide", detail: 300.4 }));
		await widths.load();
		expect(widths.get()).toEqual({ sidebar: null, detail: 300 });
	});
});

describe("resizing panes in the app", () => {
	const sidebar = () => screen.getByLabelText("Resize lists");

	it("drags the sidebar edge and remembers the width", async () => {
		const app = await renderApp({ width: 1300 });
		stop = app.stop;
		expect(sidebar().getAttribute("aria-valuenow")).toBe("280");
		fireEvent.mouseDown(sidebar(), { clientX: 280 });
		fireEvent.mouseMove(window, { clientX: 340 });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("340");
		fireEvent.mouseUp(window);
		fireEvent.mouseMove(window, { clientX: 400 });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("340");
		expect(await app.dataStore.get("atd.paneWidths")).toContain("340");
	});

	it("resizes with the keyboard and resets on double click", async () => {
		const app = await renderApp({ width: 1300 });
		stop = app.stop;
		fireEvent.keyDown(sidebar(), { key: "ArrowRight" });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("296");
		fireEvent.keyDown(sidebar(), { key: "ArrowLeft" });
		fireEvent.keyDown(sidebar(), { key: "ArrowLeft" });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("264");
		fireEvent.keyDown(sidebar(), { key: "Tab" });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("264");
		fireEvent.click(sidebar(), { detail: 1 });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("264");
		fireEvent.click(sidebar(), { detail: 2 });
		expect(sidebar().getAttribute("aria-valuenow")).toBe("280");
	});

	it("resizes the details pane from its left edge", async () => {
		const app = await renderApp({ width: 1300 });
		stop = app.stop;
		const input = screen.getByLabelText("Add a task");
		fireEvent.change(input, { target: { value: "Wide" } });
		fireEvent.keyDown(input, { key: "Enter" });
		fireEvent.click(screen.getByLabelText("Open Wide"));
		const handle = screen.getByLabelText("Resize task details");
		expect(handle.getAttribute("aria-valuenow")).toBe("320");
		fireEvent.mouseDown(handle, { clientX: 900 });
		fireEvent.mouseMove(window, { clientX: 860 });
		expect(handle.getAttribute("aria-valuenow")).toBe("360");
		fireEvent.mouseUp(window);
		fireEvent.keyDown(handle, { key: "ArrowLeft" });
		expect(handle.getAttribute("aria-valuenow")).toBe("376");
		fireEvent.click(handle, { detail: 2 });
		expect(handle.getAttribute("aria-valuenow")).toBe("320");
	});

	it("starts from a saved width", async () => {
		const app = await renderApp({
			width: 1300,
			saved: { "atd.paneWidths": JSON.stringify({ sidebar: 350 }) },
		});
		stop = app.stop;
		expect(sidebar().getAttribute("aria-valuenow")).toBe("350");
	});
});
