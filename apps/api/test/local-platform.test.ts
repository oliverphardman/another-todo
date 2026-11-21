import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { WebSocket } from "ws";
import { WebHost } from "../src/http/web-host";
import { UPLOAD_SECONDS } from "../src/infrastructure/local/disk-media";
import { bearer, login, startLocalApp, type LocalApp } from "./support/local-app";

const PNG = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

async function registerPhoto(app: LocalApp, token: string) {
	const reply = await fetch(`${app.base}/photos`, {
		method: "POST",
		headers: bearer(token, { "content-type": "application/json" }),
		body: JSON.stringify({ name: "a.png", contentType: "image/png", size: PNG.length }),
	});
	const body = (await reply.json()) as {
		photo: { id: string; url: string };
		upload: { url: string; fields: Record<string, string> };
	};
	return { id: body.photo.id, url: body.photo.url, upload: body.upload };
}

function form(fields: Record<string, string>, file: Uint8Array | null): FormData {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) {
		data.append(name, value);
	}
	if (file !== null) {
		data.append("file", new Blob([file as BlobPart], { type: "image/png" }), "a.png");
	}
	return data;
}

describe("local media storage", () => {
	it("uploads through a signed form and serves the file through a signed link", async () => {
		const app = await startLocalApp();
		const token = await login(app);
		const photo = await registerPhoto(app, token);
		expect(photo.upload.url).toBe("http://localhost:3000/media/upload");
		const target = `${app.base}/media/upload`;
		const sent = await fetch(target, { method: "POST", body: form(photo.upload.fields, PNG) });
		expect(sent.status).toBe(204);
		const listed = (await (
			await fetch(`${app.base}/photos`, { headers: bearer(token) })
		).json()) as {
			photos: { url: string }[];
		};
		const link = listed.photos[0]!.url.replace("http://localhost:3000", app.base);
		const download = await fetch(link);
		expect(download.status).toBe(200);
		expect(download.headers.get("content-type")).toBe("image/png");
		expect(new Uint8Array(await download.arrayBuffer())).toEqual(PNG);
		const removed = await fetch(`${app.base}/photos/${photo.id}`, {
			method: "DELETE",
			headers: bearer(token),
		});
		expect(removed.status).toBe(204);
		expect((await fetch(link)).status).toBe(404);
	});

	it("refuses uploads that are forged, mismatched, empty, oversized or unreadable", async () => {
		const app = await startLocalApp();
		const photo = await registerPhoto(app, await login(app));
		const target = `${app.base}/media/upload`;
		const attempt = (fields: Record<string, string>, file: Uint8Array | null) =>
			fetch(target, { method: "POST", body: form(fields, file) });
		expect((await attempt({ ...photo.upload.fields, token: "forged" }, PNG)).status).toBe(403);
		expect((await attempt(photo.upload.fields, null)).status).toBe(403);
		expect((await attempt({ token: photo.upload.fields.token! }, PNG)).status).toBe(400);
		expect((await attempt(photo.upload.fields, new Uint8Array())).status).toBe(400);
		expect((await attempt(photo.upload.fields, new Uint8Array(5 * 1024 * 1024 + 1))).status).toBe(
			400,
		);
		const garbage = await fetch(target, {
			method: "POST",
			headers: { "content-type": "multipart/form-data; boundary=x" },
			body: "not multipart",
		});
		expect(garbage.status).toBe(403);
		const empty = await fetch(target, { method: "POST" });
		expect(empty.status).toBe(403);
	});

	it("does not serve links that are forged or expired", async () => {
		vi.useFakeTimers({ toFake: ["Date"] });
		try {
			const app = await startLocalApp();
			const token = await login(app);
			const photo = await registerPhoto(app, token);
			await fetch(`${app.base}/media/upload`, {
				method: "POST",
				body: form(photo.upload.fields, PNG),
			});
			const link = photo.url.replace("http://localhost:3000", app.base);
			expect((await fetch(link)).status).toBe(200);
			expect((await fetch(`${app.base}/media/files/forged`)).status).toBe(404);
			vi.setSystemTime(Date.now() + 2 * 3600 * 1000);
			expect((await fetch(link)).status).toBe(404);
			expect(UPLOAD_SECONDS).toBe(300);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe("local realtime", () => {
	const open = (url: string) =>
		new Promise<WebSocket>((resolve, reject) => {
			const socket = new WebSocket(url);
			socket.once("open", () => resolve(socket));
			socket.once("error", reject);
			socket.once("unexpected-response", (_request, response) =>
				reject(new Error(`status ${response.statusCode}`)),
			);
		});

	it("tells a signed in user's sockets about changes and nobody else's", async () => {
		const app = await startLocalApp();
		const admin = await login(app);
		await fetch(`${app.base}/auth/users`, {
			method: "POST",
			headers: bearer(admin, { "content-type": "application/json" }),
			body: JSON.stringify({ username: "sam", password: "long enough" }),
		});
		const sam = await login(app, "sam", "long enough");
		const wsBase = app.base.replace("http", "ws");
		const mine = await open(`${wsBase}/realtime?token=${admin}`);
		const theirs = await open(`${wsBase}/realtime?token=${sam}`);
		const heard: string[] = [];
		const quiet: string[] = [];
		mine.on("message", (data) => heard.push(String(data)));
		theirs.on("message", (data) => quiet.push(String(data)));
		await fetch(`${app.base}/tasks`, {
			method: "POST",
			headers: bearer(admin, { "content-type": "application/json" }),
			body: JSON.stringify({ title: "A" }),
		});
		await vi.waitFor(() => expect(heard).toEqual(['{"type":"changed"}']));
		expect(quiet).toEqual([]);
		const second = await open(`${wsBase}/realtime?token=${admin}`);
		second.close();
		await new Promise((resolve) => second.once("close", resolve));
		mine.close();
		await new Promise((resolve) => mine.once("close", resolve));
		await app.platform.realtime.channel.deliver("admin");
		theirs.close();
		await new Promise((resolve) => theirs.once("close", resolve));
	});

	it("refuses sockets without a valid token or on another path", async () => {
		const app = await startLocalApp();
		const wsBase = app.base.replace("http", "ws");
		await expect(open(`${wsBase}/realtime`)).rejects.toThrow("status 401");
		await expect(open(`${wsBase}/realtime?token=forged`)).rejects.toThrow("status 401");
		await expect(open(`${wsBase}/elsewhere`)).rejects.toThrow();
		const { port } = app.server.address() as AddressInfo;
		expect(port).toBeGreaterThan(0);
	});

	it("accepts sockets without a token when authentication is enforced", async () => {
		const app = await startLocalApp({ ENFORCED_USERNAME: "me" });
		const socket = await open(`${app.base.replace("http", "ws")}/realtime`);
		const heard: string[] = [];
		socket.on("message", (data) => heard.push(String(data)));
		await fetch(`${app.base}/tasks`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "A" }),
		});
		await vi.waitFor(() => expect(heard).toHaveLength(1));
		socket.close();
	});
});

describe("enforced username", () => {
	it("serves everything as the one user without credentials and announces it", async () => {
		const app = await startLocalApp({
			ENFORCED_USERNAME: "me",
			SERVER_NOTICE: "Shared demo",
		});
		const created = await fetch(`${app.base}/tasks`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: "Anyone can add this" }),
		});
		expect(created.status).toBe(201);
		const listed = (await (await fetch(`${app.base}/tasks`)).json()) as { tasks: unknown[] };
		expect(listed.tasks).toHaveLength(1);
		expect(await (await fetch(`${app.base}/config`)).json()).toEqual({
			authentication: "none",
			notice: "Shared demo",
			realtimeUrl: null,
		});
		expect((await fetch(`${app.base}/auth/login`, { method: "POST" })).status).toBe(404);
	});
});

describe("web host", () => {
	function site(withIndex = true): string {
		const directory = mkdtempSync(join(tmpdir(), "atd-web-"));
		if (withIndex) {
			writeFileSync(join(directory, "index.html"), "<html>app</html>");
		}
		mkdirSync(join(directory, "assets"));
		writeFileSync(join(directory, "assets", "app.js"), "console.log(1)");
		return directory;
	}

	it("serves the built client, falls back to the index and exposes the runtime config", async () => {
		const web = new WebHost(site(), { serverUrl: "https://todo.example.com", enforced: true });
		const app = await startLocalApp({}, web.router());
		expect(await (await fetch(`${app.base}/`)).text()).toBe("<html>app</html>");
		expect(await (await fetch(`${app.base}/auth/callback`)).text()).toBe("<html>app</html>");
		expect(await (await fetch(`${app.base}/assets/app.js`)).text()).toBe("console.log(1)");
		const runtime = await fetch(`${app.base}/runtime-config.js`);
		expect(runtime.headers.get("content-type")).toContain("javascript");
		expect(await runtime.text()).toBe(
			'window.__ATD_CONFIG__ = {"serverUrl":"https://todo.example.com","enforced":true};',
		);
		expect((await fetch(`${app.base}/tasks`)).status).toBe(401);
		expect((await fetch(`${app.base}/config`)).status).toBe(200);
	});

	it("leaves unknown paths to the API when there is no index", async () => {
		const web = new WebHost(site(false), { serverUrl: "", enforced: true });
		const app = await startLocalApp({}, web.router());
		expect((await fetch(`${app.base}/anything`)).status).toBe(404);
	});
});
