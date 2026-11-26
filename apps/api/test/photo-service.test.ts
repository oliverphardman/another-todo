import { PhotoService } from "../src/application/photo-service";
import { InMemoryPhotoRepository } from "../src/infrastructure/memory/in-memory-photo-repository";
import { InMemoryViewSettingsRepository } from "../src/infrastructure/memory/in-memory-view-settings-repository";
import { FakeMediaStorage } from "./support/fake-media-storage";
import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../src/domain/errors";
import { FixedClock, createServices } from "./support/fixtures";

const input = { name: " Beach ", contentType: "image/jpeg", size: 1000 };

describe("PhotoService", () => {
	it("applies a smaller server upload limit to photos", async () => {
		const storage = new FakeMediaStorage();
		const photos = new PhotoService(
			new InMemoryPhotoRepository(),
			new InMemoryViewSettingsRepository(),
			storage,
			{ next: () => "p" },
			new FixedClock(),
			1024,
		);
		const photo = { name: "n", contentType: "image/png", size: 1025 };
		await expect(photos.create("u", photo)).rejects.toThrow(
			"size must be between 1 and 1024 bytes",
		);
		await photos.create("u", { ...photo, size: 1024 });
		expect(storage.uploads[0]!.maxBytes).toBe(1024);
	});

	it("registers a photo and returns a signed upload with the size and type limits", async () => {
		const { photos, storage } = createServices();
		const created = await photos.create("u", input);
		expect(created.photo.name).toBe("Beach");
		expect(created.photo.storageKey).toBe(`u/${created.photo.id}`);
		expect(created.url).toContain(created.photo.storageKey);
		expect(created.upload.url).toBe("https://upload.test/photos");
		expect(storage.uploads).toEqual([
			{ key: created.photo.storageKey, contentType: "image/jpeg", maxBytes: 5 * 1024 * 1024 },
		]);
		expect(created.photo.toView(created.url).url).toBe(created.url);
		expect(JSON.stringify(created.photo.toView(created.url))).not.toContain("ownerId");
	});

	it("validates the name, type and size", async () => {
		const { photos } = createServices();
		const bad: Record<string, unknown>[] = [
			{ ...input, name: "" },
			{ ...input, name: "   " },
			{ ...input, name: 5 },
			{ ...input, name: "x".repeat(121) },
			{ ...input, contentType: "image/gif" },
			{ ...input, contentType: undefined },
			{ ...input, size: 0 },
			{ ...input, size: 1.5 },
			{ ...input, size: "big" },
			{ ...input, size: 5 * 1024 * 1024 + 1 },
		];
		for (const value of bad) {
			await expect(photos.create("u", value)).rejects.toThrow(ValidationError);
		}
	});

	it("lists the caller's photos oldest first with download links", async () => {
		const clock = new FixedClock();
		const { photos } = createServices(clock);
		const first = await photos.create("u", input);
		const second = await photos.create("u", input);
		clock.advance(1000);
		const third = await photos.create("u", input);
		await photos.create("other", input);
		const listed = await photos.list("u");
		expect(listed.map((entry) => entry.photo.id)).toEqual([
			first.photo.id,
			second.photo.id,
			third.photo.id,
		]);
		expect(listed.every((entry) => entry.url.startsWith("https://photos.test/u/"))).toBe(true);
	});

	it("deletes the object and record, and clears themes that used the photo", async () => {
		const { photos, settings, storage } = createServices();
		const { photo } = await photos.create("u", input);
		const other = await photos.create("u", input);
		await settings.put("u", "uses", {
			sort: "due",
			hideCompleted: true,
			theme: { type: "photo", photoId: photo.id },
		});
		await settings.put("u", "keeps", {
			sort: null,
			hideCompleted: false,
			theme: { type: "photo", photoId: other.photo.id },
		});
		await settings.put("u", "color", {
			sort: null,
			hideCompleted: false,
			theme: { type: "color", color: "#112233" },
		});
		await settings.put("u", "none", { sort: null, hideCompleted: false, theme: null });
		await photos.delete("u", photo.id);
		expect(storage.removed).toEqual([photo.storageKey]);
		const byId = new Map((await settings.list("u")).map((entry) => [entry.id, entry]));
		expect(byId.get("uses")).toMatchObject({ sort: "due", hideCompleted: true, theme: null });
		expect(byId.get("keeps")!.theme).toEqual({ type: "photo", photoId: other.photo.id });
		expect(byId.get("color")!.theme).toEqual({ type: "color", color: "#112233" });
		expect((await photos.list("u")).map((entry) => entry.photo.id)).toEqual([other.photo.id]);
	});

	it("does not delete another user's photo and keeps the record if storage fails", async () => {
		const { photos, storage } = createServices();
		const { photo } = await photos.create("u", input);
		await expect(photos.delete("other", photo.id)).rejects.toThrow(NotFoundError);
		await expect(photos.delete("u", "ghost")).rejects.toThrow(NotFoundError);
		storage.failRemoval = true;
		await expect(photos.delete("u", photo.id)).rejects.toThrow("storage offline");
		expect(await photos.list("u")).toHaveLength(1);
	});
});
