import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizedHttp } from "../src/api/authorized-http";
import { ApiError } from "../src/api/errors";
import { AttachmentRules, type PickedFile } from "../src/attachments/attachment";
import {
	AttachmentUploadError,
	HttpAttachmentGateway,
} from "../src/attachments/http-attachment-gateway";
import { TaskAttachments } from "../src/attachments/task-attachments";
import { UnavailableFilePicker } from "../src/attachments/unavailable-file-picker";
import { FakeAttachmentGateway, FakeFilePicker } from "./support/fakes";

const documents = vi.hoisted(() => ({ getDocumentAsync: vi.fn() }));
vi.mock("expo-document-picker", () => documents);

import { ExpoFilePicker } from "../src/attachments/expo-file-picker";

const stored = {
	id: "a1",
	taskId: "t 1",
	name: "report.pdf",
	contentType: "application/pdf",
	size: 3,
	createdAt: "2026-11-19T10:00:00.000Z",
	url: "https://files.test/a1",
};

const file: PickedFile = {
	name: "report.pdf",
	contentType: "application/pdf",
	size: 3,
	body: new Blob(["abc"]),
};

function gatewayFor(upload: Response | Error = new Response(null, { status: 204 })) {
	const calls: { method: string; url: string }[] = [];
	const fetcher = async (url: string, init?: RequestInit): Promise<Response> => {
		calls.push({ method: init?.method ?? "GET", url });
		if (url.startsWith("https://upload.test")) {
			if (upload instanceof Error) {
				throw upload;
			}
			return upload;
		}
		if (init?.method === "POST") {
			return new Response(
				JSON.stringify({
					attachment: stored,
					upload: { url: "https://upload.test/f", fields: {} },
				}),
				{ status: 201 },
			);
		}
		if (init?.method === "DELETE") {
			return new Response(null, { status: 204 });
		}
		return new Response(JSON.stringify({ attachments: [stored] }));
	};
	const http = new AuthorizedHttp("https://api.test", { getAccessToken: async () => "t" }, fetcher);
	return { gateway: new HttpAttachmentGateway(http, fetcher), calls };
}

describe("AttachmentRules", () => {
	it("rejects empty and oversized files", () => {
		expect(AttachmentRules.problemWith({ ...file, size: 0 })).toBe("attachment.errorUnreadable");
		expect(AttachmentRules.problemWith({ ...file, size: 26 * 1024 * 1024 })).toBe(
			"attachment.errorSize",
		);
		expect(AttachmentRules.problemWith(file)).toBeNull();
	});
});

describe("HttpAttachmentGateway", () => {
	it("lists, uploads and removes through the task's path", async () => {
		const { gateway, calls } = gatewayFor();
		expect(await gateway.list("t 1")).toEqual([stored]);
		expect(await gateway.create("t 1", file)).toEqual(stored);
		await gateway.remove("t 1", "a b");
		expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
			"GET https://api.test/tasks/t%201/attachments",
			"POST https://api.test/tasks/t%201/attachments",
			"POST https://upload.test/f",
			"DELETE https://api.test/tasks/t%201/attachments/a%20b",
		]);
	});

	it("removes the record again when the upload fails", async () => {
		const { gateway, calls } = gatewayFor(new Response("no", { status: 403 }));
		await expect(gateway.create("t", file)).rejects.toBeInstanceOf(AttachmentUploadError);
		expect(calls.at(-1)?.method).toBe("DELETE");
	});

	it("still reports the failed upload when the cleanup also fails", async () => {
		const fetcher = async (url: string, init?: RequestInit): Promise<Response> => {
			if (url.startsWith("https://upload.test")) {
				return new Response("no", { status: 500 });
			}
			if (init?.method === "DELETE") {
				throw new Error("offline");
			}
			return new Response(
				JSON.stringify({
					attachment: stored,
					upload: { url: "https://upload.test/f", fields: {} },
				}),
				{ status: 201 },
			);
		};
		const http = new AuthorizedHttp(
			"https://api.test",
			{ getAccessToken: async () => "t" },
			fetcher,
		);
		await expect(new HttpAttachmentGateway(http, fetcher).create("t", file)).rejects.toBeInstanceOf(
			AttachmentUploadError,
		);
	});

	it("uses the global fetch for uploads by default", async () => {
		const original = globalThis.fetch;
		globalThis.fetch = (async () => new Response(null, { status: 204 })) as typeof fetch;
		try {
			const http = new AuthorizedHttp(
				"https://api.test",
				{ getAccessToken: async () => "t" },
				async () =>
					new Response(
						JSON.stringify({ attachment: stored, upload: { url: "https://u.test", fields: {} } }),
						{ status: 201 },
					),
			);
			expect(await new HttpAttachmentGateway(http).create("t", file)).toEqual(stored);
		} finally {
			globalThis.fetch = original;
		}
	});
});

describe("file pickers", () => {
	beforeEach(() => documents.getDocumentAsync.mockReset());

	it("returns nothing when cancelled and in the desktop placeholder", async () => {
		documents.getDocumentAsync.mockResolvedValue({ canceled: true, assets: null });
		expect(await new ExpoFilePicker().pick()).toBeNull();
		expect(await new UnavailableFilePicker().pick()).toBeNull();
	});

	it("describes a browser file and a native one with defaults", async () => {
		const browser = new File(["abcd"], "a.txt", { type: "text/plain" });
		documents.getDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "blob:x", name: "a.txt", mimeType: "text/plain", file: browser }],
		});
		expect(await new ExpoFilePicker().pick()).toEqual({
			name: "a.txt",
			contentType: "text/plain",
			size: 4,
			body: browser,
		});
		documents.getDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file:///b", name: "b.bin", size: 9 }],
		});
		expect(await new ExpoFilePicker().pick()).toEqual({
			name: "b.bin",
			contentType: "application/octet-stream",
			size: 9,
			body: { uri: "file:///b", name: "b.bin", type: "application/octet-stream" },
		});
		documents.getDocumentAsync.mockResolvedValue({
			canceled: false,
			assets: [{ uri: "file:///c", name: "c" }],
		});
		expect((await new ExpoFilePicker().pick())?.size).toBe(0);
	});
});

describe("TaskAttachments", () => {
	function setup() {
		const gateway = new FakeAttachmentGateway();
		const picker = new FakeFilePicker();
		return { gateway, picker, attachments: new TaskAttachments(gateway, picker) };
	}

	it("loads a task's attachments and clears them", async () => {
		const { gateway, attachments } = setup();
		await gateway.create("t", file);
		await attachments.show("t");
		expect(attachments.get().items).toHaveLength(1);
		await attachments.show(null);
		expect(attachments.get().items).toEqual([]);
		expect(attachments.get().taskId).toBeNull();
	});

	it("reports a failed load and ignores late answers for another task", async () => {
		const { gateway, attachments } = setup();
		gateway.failure = new ApiError(500, "boom");
		await attachments.show("t");
		expect(attachments.get().error).toEqual({ message: "boom" });
		gateway.failure = new Error("offline");
		await attachments.show("t");
		expect(attachments.get().error).toEqual({ key: "attachment.errorUnavailable" });
		gateway.failure = null;
		const slow = attachments.show("a");
		await attachments.show("b");
		await slow;
		expect(attachments.get().taskId).toBe("b");
		gateway.failure = new Error("late");
		const failing = attachments.show("c");
		await attachments.show(null);
		await failing;
		expect(attachments.get().error).toBeNull();
	});

	it("uploads a picked file", async () => {
		const { attachments } = setup();
		await attachments.show("t");
		await attachments.add();
		expect(attachments.get().items.map((item) => item.name)).toEqual(["report.pdf"]);
		expect(attachments.get().busy).toBe("idle");
	});

	it("does nothing without a task, when cancelled, or when the file is unusable", async () => {
		const { picker, attachments } = setup();
		await attachments.add();
		await attachments.remove("x");
		await attachments.show("t");
		picker.next = null;
		await attachments.add();
		expect(attachments.get()).toMatchObject({ items: [], busy: "idle", error: null });
		picker.next = { ...file, size: 0 };
		await attachments.add();
		expect(attachments.get().error).toEqual({ key: "attachment.errorUnreadable" });
	});

	it("reports upload failures", async () => {
		const { picker, gateway, attachments } = setup();
		await attachments.show("t");
		picker.next = new Error("picker");
		await attachments.add();
		expect(attachments.get().error).toEqual({ key: "attachment.errorUnavailable" });
		picker.next = file;
		gateway.failure = new ApiError(400, "bad");
		await attachments.add();
		expect(attachments.get().error).toEqual({ message: "bad" });
	});

	it("does not touch another task's list when the task changes mid upload", async () => {
		const { picker, attachments } = setup();
		await attachments.show("t");
		picker.pick = async () => {
			await attachments.show("other");
			return file;
		};
		await attachments.add();
		expect(attachments.get()).toMatchObject({ taskId: "other", items: [] });
	});

	it("removes an attachment and reports failures", async () => {
		const { gateway, attachments } = setup();
		await attachments.show("t");
		await attachments.add();
		const id = attachments.get().items[0]!.id;
		gateway.failure = new Error("offline");
		await attachments.remove(id);
		expect(attachments.get().items).toHaveLength(1);
		expect(attachments.get().error).toEqual({ key: "attachment.errorUnavailable" });
		gateway.failure = null;
		await attachments.remove(id);
		expect(attachments.get().items).toEqual([]);
		expect(attachments.get().error).toBeNull();
	});
});
