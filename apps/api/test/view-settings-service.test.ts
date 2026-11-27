import { describe, expect, it } from "vitest";
import { ValidationError } from "../src/domain/errors";
import { ViewSettings } from "../src/domain/view-settings";
import { createServices } from "./support/fixtures";

const valid = { sort: null, hideCompleted: false, theme: null };

describe("ViewSettingsService", () => {
	it("reads records saved before sort direction existed as ascending and keeps it when the theme is cleared", () => {
		const legacy = ViewSettings.restore({
			ownerId: "u",
			id: "v",
			sort: "due",
			hideCompleted: false,
			theme: null,
			updatedAt: "2026-01-01T00:00:00.000Z",
		});
		expect(legacy.sortDescending).toBe(false);
		const reversed = ViewSettings.restore({ ...legacy.toRecord(), sortDescending: true });
		expect(reversed.withoutTheme(new Date()).sortDescending).toBe(true);
	});

	it("stores the sort direction, defaults it to ascending and validates it", async () => {
		const { settings } = createServices();
		expect((await settings.put("u", "a", valid)).sortDescending).toBe(false);
		expect((await settings.put("u", "a", { ...valid, sortDescending: true })).sortDescending).toBe(
			true,
		);
		await expect(settings.put("u", "a", { ...valid, sortDescending: "up" })).rejects.toThrow(
			"sortDescending must be a boolean",
		);
	});

	it("stores settings per view and replaces them as a whole", async () => {
		const { settings } = createServices();
		await settings.put("u", "my-day", { sort: "due", hideCompleted: true, theme: null });
		const replaced = await settings.put("u", "my-day", valid);
		expect(replaced.sort).toBeNull();
		expect(replaced.hideCompleted).toBe(false);
		await settings.put("u", "abc", { ...valid, sort: "alphabetical" });
		expect((await settings.list("u")).map((entry) => entry.id)).toEqual(["abc", "my-day"]);
		expect(await settings.list("other")).toEqual([]);
		expect(JSON.parse(JSON.stringify(replaced))).toMatchObject({ id: "my-day", sort: null });
		expect(JSON.parse(JSON.stringify(replaced)).ownerId).toBeUndefined();
	});

	it("accepts every sort key and normalizes color themes", async () => {
		const { settings } = createServices();
		for (const sort of ["importance", "alphabetical", "due", "created", "myDay"]) {
			expect((await settings.put("u", "v", { ...valid, sort })).sort).toBe(sort);
		}
		const themed = await settings.put("u", "v", {
			...valid,
			theme: { type: "color", color: "#2564CF" },
		});
		expect(themed.theme).toEqual({ type: "color", color: "#2564cf" });
	});

	it("rejects malformed settings", async () => {
		const { settings } = createServices();
		const bad: Record<string, unknown>[] = [
			{ ...valid, sort: "random" },
			{ ...valid, sort: 3 },
			{ ...valid, hideCompleted: "yes" },
			{ ...valid, theme: "blue" },
			{ ...valid, theme: { type: "color", color: "red" } },
			{ ...valid, theme: { type: "color" } },
			{ ...valid, theme: { type: "gradient" } },
		];
		for (const input of bad) {
			await expect(settings.put("u", "v", input)).rejects.toThrow(ValidationError);
		}
		await expect(settings.put("u", "bad id", valid)).rejects.toThrow(ValidationError);
		await expect(settings.put("u", "v", { ...valid, theme: undefined })).rejects.toThrow(
			ValidationError,
		);
		await expect(settings.put("u", "v", { ...valid, theme: { type: "photo" } })).rejects.toThrow(
			ValidationError,
		);
	});

	it("stores preset photo themes by id without needing an uploaded photo", async () => {
		const { settings } = createServices();
		const themed = await settings.put("u", "v", {
			...valid,
			theme: { type: "preset", presetId: "aurora", photoId: "ignored" },
		});
		expect(themed.theme).toEqual({ type: "preset", presetId: "aurora" });
		expect((await settings.list("u"))[0]!.theme).toEqual({ type: "preset", presetId: "aurora" });
		for (const theme of [{ type: "preset" }, { type: "preset", presetId: "not valid" }]) {
			await expect(settings.put("u", "v", { ...valid, theme })).rejects.toThrow(ValidationError);
		}
	});

	it("only allows photo themes that exist for the caller", async () => {
		const { settings, photos } = createServices();
		await expect(
			settings.put("u", "v", { ...valid, theme: { type: "photo", photoId: "ghost" } }),
		).rejects.toThrow("Photo ghost does not exist");
		const { photo } = await photos.create("u", {
			name: "Beach",
			contentType: "image/png",
			size: 10,
		});
		const themed = await settings.put("u", "v", {
			...valid,
			theme: { type: "photo", photoId: photo.id },
		});
		expect(themed.theme).toEqual({ type: "photo", photoId: photo.id });
		await expect(
			settings.put("other", "v", { ...valid, theme: { type: "photo", photoId: photo.id } }),
		).rejects.toThrow(ValidationError);
	});
});
