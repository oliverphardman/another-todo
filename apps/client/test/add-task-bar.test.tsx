import { readFileSync } from "node:fs";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LIST_THEME_COLOR } from "../src/domain/view-settings";
import { ColorMath } from "../src/ui/color-math";
import { IconArtwork } from "../src/ui/icon-artwork";
import { DARK, LIGHT } from "../src/ui/theme";
import { renderApp } from "./support/render-app";

let stop: (() => void) | undefined;

afterEach(() => {
	stop?.();
	stop = undefined;
	cleanup();
});

async function start(options: Parameters<typeof renderApp>[0] = {}) {
	const app = await renderApp(options);
	stop = app.stop;
	act(() => app.connectivity.setOnline(false));
	act(() => app.container.store.select("tasks"));
	return app;
}

const input = () => screen.getByLabelText("Add a Task") as HTMLInputElement;
const bar = () => input().parentElement!;
const glyph = () => bar().querySelector("path")!.getAttribute("d");

function rgb(hex: string): string {
	const value = Number.parseInt(hex.slice(1), 16);
	return `rgb(${value >> 16}, ${(value >> 8) & 255}, ${value & 255})`;
}

async function usePhoto(app: Awaited<ReturnType<typeof start>>) {
	act(() => app.connectivity.setOnline(true));
	app.photoPicker.next = {
		name: "beach.png",
		contentType: "image/png",
		size: 10,
		body: new Blob(["x"]),
	};
	await act(async () => {
		const photo = await app.container.photos.upload();
		app.container.store.updateSettings("tasks", {
			theme: { type: "photo", photoId: photo!.id },
		});
	});
}

describe("Add a Task field", () => {
	it("shows a plus until it is focused, then an uncompleted task's circle", async () => {
		await start();
		expect(input().placeholder).toBe("Add a Task");
		expect(glyph()).toBe(IconArtwork.path("plus").d);
		fireEvent.focus(input());
		expect(glyph()).toBe(IconArtwork.path("circle").d);
		fireEvent.blur(input());
		expect(glyph()).toBe(IconArtwork.path("plus").d);
	});

	it("keeps the circle while it holds text, and has no Add button", async () => {
		await start();
		fireEvent.focus(input());
		fireEvent.change(input(), { target: { value: "Half typed" } });
		fireEvent.blur(input());
		expect(glyph()).toBe(IconArtwork.path("circle").d);
		expect(screen.queryByText("Add")).toBeNull();
		fireEvent.change(input(), { target: { value: "" } });
		expect(glyph()).toBe(IconArtwork.path("plus").d);
	});

	it("is a darker shade of the list's theme", async () => {
		const app = await start();
		const shade = (color: string) => rgb(ColorMath.mix(color, "#000000", 0.18));
		expect(bar().style.backgroundColor).toBe(shade(LIST_THEME_COLOR));
		expect(input().style.color).toBe(rgb("#ffffff"));
		act(() =>
			app.container.store.updateSettings("tasks", { theme: { type: "color", color: "#c0392b" } }),
		);
		expect(bar().style.backgroundColor).toBe(shade("#c0392b"));
	});

	it.each([
		["top", { from: 0.1, to: 0.35 }],
		["bottom", { from: 0.75, to: 1 }],
	] as const)("samples a photo where the field sits at the %s", async (position, band) => {
		const app = await start();
		app.imageSampler.color = () => "#101010";
		act(() => app.container.settings.change({ addTaskPosition: position }));
		await usePhoto(app);
		await waitFor(() => expect(bar().style.backgroundColor).toBe(rgb(DARK.surface)));
		expect(app.imageSampler.calls).toEqual([{ url: "https://photos.test/photo-1", band }]);
		expect(input().style.color).toBe(rgb(DARK.text));
	});

	it("follows the part of the photo behind it when it moves", async () => {
		const app = await start({ scheme: "dark" });
		app.imageSampler.color = (band) => (band.from > 0.5 ? "#101010" : "#f0f0f0");
		await usePhoto(app);
		await waitFor(() => expect(bar().style.backgroundColor).toBe(rgb(LIGHT.surface)));
		expect(input().style.color).toBe(rgb(LIGHT.text));
		act(() => app.container.settings.change({ addTaskPosition: "bottom" }));
		await waitFor(() => expect(bar().style.backgroundColor).toBe(rgb(DARK.surface)));
		act(() => app.container.settings.change({ addTaskPosition: "top" }));
		expect(bar().style.backgroundColor).toBe(rgb(LIGHT.surface));
		expect(app.imageSampler.calls).toHaveLength(2);
	});

	it.each([
		["light", LIGHT],
		["dark", DARK],
	] as const)("uses the %s default when a photo cannot be read", async (scheme, palette) => {
		const app = await start({ scheme });
		await usePhoto(app);
		await waitFor(() => expect(app.imageSampler.calls).toHaveLength(1));
		expect(bar().style.backgroundColor).toBe(rgb(palette.surface));
	});
});

describe("native image sampling", () => {
	const read = (path: string) => readFileSync(path, "utf8");

	it("is provided to macOS by the system pod", () => {
		const source = read("macos/AnotherToDoSystem/AnotherToDoImages.mm");
		expect(source).toContain("RCT_EXPORT_MODULE()");
		expect(source).toContain("RCT_EXPORT_METHOD(averageColor:(NSString *)uri");
		expect(read("macos/AnotherToDoSystem/AnotherToDoSystem.podspec")).toContain('"ImageIO"');
	});

	it("is provided to phones by a local Expo module", () => {
		const config = JSON.parse(read("modules/another-todo-images/expo-module.config.json")) as {
			platforms: string[];
		};
		expect(config.platforms).toEqual(["ios", "android"]);
		for (const path of [
			"ios/AnotherToDoImagesModule.swift",
			"android/src/main/java/dev/oliverhardman/anothertodo/images/AnotherToDoImagesModule.kt",
		]) {
			const source = read(`modules/another-todo-images/${path}`);
			expect(source).toContain('Name("AnotherToDoImages")');
			expect(source).toContain('AsyncFunction("averageColor")');
		}
	});
});
