import { describe, expect, it } from "vitest";
import { AuthorizedHttp } from "../src/api/authorized-http";
import { HttpPhotoGateway, PhotoUploadError } from "../src/photos/http-photo-gateway";
import type { PickedPhoto } from "../src/photos/photo";

interface Call {
	method: string;
	url: string;
	body: unknown;
}

const photo = {
	id: "p1",
	name: "beach.png",
	contentType: "image/png",
	size: 3,
	createdAt: "2026-11-19T10:00:00.000Z",
	url: "https://photos.test/p1",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function setup(
	uploadResult: Response | Error = new Response(null, { status: 204 }),
	deleteResult: Response | Error = new Response(null, { status: 204 }),
) {
	const calls: Call[] = [];
	const fetcher = async (url: string, init?: RequestInit): Promise<Response> => {
		calls.push({ method: init?.method ?? "GET", url, body: init?.body });
		if (url.startsWith("https://upload.test")) {
			if (uploadResult instanceof Error) {
				throw uploadResult;
			}
			return uploadResult;
		}
		if (init?.method === "POST") {
			return json(
				{
					photo,
					upload: {
						url: "https://upload.test/form",
						fields: { key: "u/p1", "Content-Type": "image/png" },
					},
				},
				201,
			);
		}
		if (init?.method === "DELETE") {
			if (deleteResult instanceof Error) {
				throw deleteResult;
			}
			return deleteResult;
		}
		return json({ photos: [photo] });
	};
	const http = new AuthorizedHttp("https://api.test", { getAccessToken: async () => "t" }, fetcher);
	return { gateway: new HttpPhotoGateway(http, fetcher), calls };
}

const blobPhoto: PickedPhoto = {
	name: "beach.png",
	contentType: "image/png",
	size: 3,
	body: new Blob(["abc"], { type: "image/png" }),
};

describe("HttpPhotoGateway", () => {
	it("lists photos", async () => {
		expect(await setup().gateway.list()).toEqual([photo]);
	});

	it("registers a photo then uploads it with the signed fields before the file", async () => {
		const { gateway, calls } = setup();
		expect(await gateway.create(blobPhoto)).toEqual(photo);
		expect(JSON.parse(calls[0]!.body as string)).toEqual({
			name: "beach.png",
			contentType: "image/png",
			size: 3,
		});
		const form = calls[1]!.body as FormData;
		expect([...form.keys()]).toEqual(["key", "Content-Type", "file"]);
		expect(form.get("key")).toBe("u/p1");
		expect((form.get("file") as File).name).toBe("beach.png");
		expect(calls[1]!.url).toBe("https://upload.test/form");
	});

	it("sends native file descriptors as the file part", async () => {
		const { gateway, calls } = setup();
		const native = { uri: "file:///photo.png", name: "photo.png", type: "image/png" };
		await gateway.create({ ...blobPhoto, body: native });
		const form = calls[1]!.body as FormData;
		expect([...form.keys()].at(-1)).toBe("file");
	});

	it("deletes the record again when the upload is refused or cannot be sent", async () => {
		const refused = setup(new Response("denied", { status: 403 }));
		await expect(refused.gateway.create(blobPhoto)).rejects.toBeInstanceOf(PhotoUploadError);
		expect(refused.calls.map((call) => call.method)).toEqual(["POST", "POST", "DELETE"]);
		expect(refused.calls[2]!.url).toBe("https://api.test/photos/p1");
		const offline = setup(new TypeError("network"));
		await expect(offline.gateway.create(blobPhoto)).rejects.toThrow("could not be uploaded");
		const cleanupFails = setup(new Response(null, { status: 500 }), new Error("offline"));
		await expect(cleanupFails.gateway.create(blobPhoto)).rejects.toBeInstanceOf(PhotoUploadError);
	});

	it("deletes photos", async () => {
		const { gateway, calls } = setup();
		await gateway.remove("a b");
		expect(calls[0]).toMatchObject({ method: "DELETE", url: "https://api.test/photos/a%20b" });
	});

	it("uses the global fetch for uploads by default", async () => {
		const original = globalThis.fetch;
		globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
		try {
			const http = new AuthorizedHttp(
				"https://api.test",
				{ getAccessToken: async () => "t" },
				async () => json({ photo, upload: { url: "https://upload.test", fields: {} } }, 201),
			);
			expect(await new HttpPhotoGateway(http).create(blobPhoto)).toEqual(photo);
		} finally {
			globalThis.fetch = original;
		}
	});
});
