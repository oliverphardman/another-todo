import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api/errors";
import type { AuthStatus } from "../src/auth/authentication-service";
import { PhotoLibrary } from "../src/photos/photo-library";
import { Observable } from "../src/state/observable";
import { FakePhotoGateway, FakePhotoPicker } from "./support/fakes";

class StubAuth extends Observable<AuthStatus> {
	constructor(status: AuthStatus = "signedIn") {
		super(status);
	}

	setStatus(status: AuthStatus): void {
		this.set(status);
	}
}

function setup(status: AuthStatus = "signedIn") {
	const gateway = new FakePhotoGateway();
	const picker = new FakePhotoPicker();
	const auth = new StubAuth(status);
	return { gateway, picker, auth, library: new PhotoLibrary(gateway, picker, auth) };
}

describe("PhotoLibrary", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("loads photos when started signed in, and again on a timer", async () => {
		const { library, gateway } = setup();
		gateway.photos = [
			{ id: "p", name: "n", contentType: "image/png", size: 1, createdAt: "x", url: "https://u/p" },
		];
		library.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(library.get().photos).toHaveLength(1);
		expect(library.urlFor("p")).toBe("https://u/p");
		expect(library.urlFor("missing")).toBeNull();
		gateway.calls = [];
		await vi.advanceTimersByTimeAsync(30 * 60_000);
		expect(gateway.calls).toEqual(["list"]);
		library.stop();
	});

	it("waits for sign in, refreshes when it happens and forgets photos on sign out", async () => {
		const { library, gateway, auth } = setup("loading");
		library.start();
		await vi.advanceTimersByTimeAsync(30 * 60_000);
		expect(gateway.calls).toEqual([]);
		auth.setStatus("signedIn");
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toEqual(["list"]);
		gateway.photos = [
			{ id: "p", name: "n", contentType: "image/png", size: 1, createdAt: "x", url: "u" },
		];
		await library.refresh();
		expect(library.get().photos).toHaveLength(1);
		auth.setStatus("loading");
		expect(library.get().photos).toHaveLength(1);
		auth.setStatus("signedOut");
		expect(library.get()).toEqual({ photos: [], busy: "idle", error: null });
		library.stop();
		library.stop();
	});

	it("restarts cleanly", async () => {
		const { library, gateway } = setup();
		library.start();
		library.start();
		await vi.advanceTimersByTimeAsync(0);
		expect(gateway.calls).toEqual(["list", "list"]);
		library.stop();
	});

	it("only reports a failed refresh when the user asked for it", async () => {
		const { library, gateway } = setup();
		gateway.failure = new Error("offline");
		await library.refresh(true);
		expect(library.get().error).toBeNull();
		await library.refresh();
		expect(library.get().error).toEqual({ key: "photo.errorUnavailable" });
		gateway.failure = new ApiError(500, "Server exploded");
		await library.refresh();
		expect(library.get().error).toEqual({ message: "Server exploded" });
		gateway.failure = null;
		await library.refresh();
		expect(library.get().error).toBeNull();
		gateway.failure = new Error("offline again");
		await library.refresh(true);
		expect(library.get().error).toBeNull();
	});

	it("keeps showing an upload in progress when the photo list refreshes meanwhile", async () => {
		const { library, gateway } = setup();
		let release: (() => void) | undefined;
		const gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		const create = gateway.create.bind(gateway);
		gateway.create = async (picked) => {
			await gate;
			return create(picked);
		};
		const uploading = library.upload();
		await vi.advanceTimersByTimeAsync(0);
		expect(library.get().busy).toBe("uploading");
		await library.refresh();
		expect(library.get().busy).toBe("uploading");
		gateway.failure = new Error("offline");
		await library.refresh();
		expect(library.get().busy).toBe("uploading");
		gateway.failure = null;
		release?.();
		await uploading;
		expect(library.get().busy).toBe("idle");
		expect(library.get().photos).toHaveLength(1);
	});

	it("uploads a picked photo and adds it to the library", async () => {
		const { library, picker, gateway } = setup();
		const states: string[] = [];
		library.subscribe(() => states.push(library.get().busy));
		const photo = await library.upload();
		expect(photo).toMatchObject({ name: "beach.png" });
		expect(library.get().photos).toHaveLength(1);
		expect(states).toContain("uploading");
		expect(library.get().busy).toBe("idle");
		picker.next = { name: "b.webp", contentType: "image/webp", size: 5, body: new Blob(["x"]) };
		await library.upload();
		expect(gateway.photos.map((entry) => entry.name)).toEqual(["beach.png", "b.webp"]);
	});

	it("does nothing when the picker is cancelled", async () => {
		const { library, picker, gateway } = setup();
		picker.next = null;
		expect(await library.upload()).toBeNull();
		expect(gateway.calls).toEqual([]);
		expect(library.get().busy).toBe("idle");
	});

	it("rejects photos of the wrong type, size or content before uploading", async () => {
		const { library, picker, gateway } = setup();
		const base = { name: "x", body: new Blob(["x"]) };
		picker.next = { ...base, contentType: "image/gif", size: 10 };
		expect(await library.upload()).toBeNull();
		expect(library.get().error).toEqual({ key: "photo.errorType" });
		picker.next = { ...base, contentType: "image/png", size: 0 };
		await library.upload();
		expect(library.get().error).toEqual({ key: "photo.errorUnreadable" });
		picker.next = { ...base, contentType: "image/png", size: 6 * 1024 * 1024 };
		await library.upload();
		expect(library.get().error).toEqual({ key: "photo.errorSize" });
		expect(gateway.calls).toEqual([]);
	});

	it("reports upload failures", async () => {
		const { library, picker, gateway } = setup();
		gateway.failure = new ApiError(400, "Photo rejected");
		await library.upload();
		expect(library.get().error).toEqual({ message: "Photo rejected" });
		gateway.failure = null;
		picker.next = new Error("picker crashed");
		await library.upload();
		expect(library.get().error).toEqual({ key: "photo.errorUnavailable" });
		expect(library.get().busy).toBe("idle");
	});

	it("removes photos permanently, and keeps them if removal fails", async () => {
		const { library, gateway } = setup();
		const photo = (await library.upload())!;
		gateway.failure = new ApiError(500, "Cannot delete");
		expect(await library.remove(photo.id)).toBe(false);
		expect(library.get().photos).toHaveLength(1);
		expect(library.get().error).toEqual({ message: "Cannot delete" });
		gateway.failure = null;
		expect(await library.remove(photo.id)).toBe(true);
		expect(library.get().photos).toEqual([]);
		expect(library.get().error).toBeNull();
		gateway.failure = new Error("offline");
		await library.remove("x");
		expect(library.get().error).toEqual({ key: "photo.errorUnavailable" });
	});
});
