import { describe, expect, it } from "vitest";
import { FailingClient } from "./support/fake-document-client";
import { event, rpcEvent } from "./support/events";
import { TEST_ISSUER, TEST_ORIGIN, createTestApi } from "./support/test-api";

describe("REST API", () => {
	it("creates, reads, updates, lists and deletes a task", async () => {
		const api = createTestApi();
		const created = await api(event({ method: "POST", path: "/tasks", body: { title: "A" } }));
		expect(created.status).toBe(201);
		expect(created.body).toMatchObject({
			title: "A",
			completed: false,
			importance: "normal",
			dueDate: null,
		});
		const id = created.body.id;
		expect((await api(event({ path: `/tasks/${id}` }))).body.title).toBe("A");
		const patched = await api(
			event({
				method: "PATCH",
				path: `/tasks/${id}`,
				body: { completed: true, importance: "high", dueDate: "2026-03-01T00:00:00Z" },
			}),
		);
		expect(patched.body).toMatchObject({ completed: true, importance: "high" });
		expect((await api(event({ path: "/tasks" }))).body.tasks).toHaveLength(1);
		expect((await api(event({ method: "DELETE", path: `/tasks/${id}` }))).status).toBe(204);
		expect((await api(event({ path: `/tasks/${id}` }))).status).toBe(404);
	});

	it("validates requests against the OpenAPI definition", async () => {
		const api = createTestApi();
		const post = (body: unknown) => api(event({ method: "POST", path: "/tasks", body }));
		expect((await post({})).status).toBe(400);
		expect((await post({ title: "" })).status).toBe(400);
		expect((await post({ title: "A", importance: "low" })).status).toBe(400);
		expect((await post({ title: "A", extra: true })).status).toBe(400);
		expect((await post({ title: "   " })).status).toBe(400);
		expect((await post({ title: "A", dueDate: "tomorrow" })).status).toBe(400);
		const malformed = await api(event({ method: "POST", path: "/tasks", rawBody: "{" }));
		expect(malformed.status).toBe(400);
		const patch = await api(event({ method: "PATCH", path: "/tasks/x", body: { title: 3 } }));
		expect(patch.status).toBe(400);
	});

	it("returns 404 for unknown tasks, paths and 405 for wrong methods", async () => {
		const api = createTestApi();
		expect((await api(event({ path: "/tasks/nope" }))).status).toBe(404);
		expect((await api(event({ method: "PATCH", path: "/tasks/nope", body: {} }))).status).toBe(404);
		expect((await api(event({ method: "DELETE", path: "/tasks/nope" }))).status).toBe(404);
		expect((await api(event({ path: "/nowhere" }))).status).toBe(404);
		expect((await api(event({ method: "PUT", path: "/tasks", body: {} }))).status).toBe(405);
	});

	it("isolates users from one another", async () => {
		const api = createTestApi();
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "Private" }, sub: "alice" }),
		);
		expect((await api(event({ path: `/tasks/${created.body.id}`, sub: "bob" }))).status).toBe(404);
		expect((await api(event({ path: "/tasks", sub: "bob" }))).body.tasks).toEqual([]);
	});

	it("rejects unauthenticated requests", async () => {
		const api = createTestApi();
		expect((await api(event({ path: "/tasks", sub: null }))).status).toBe(401);
		expect((await api(event({ path: "/tasks", sub: "" }))).status).toBe(401);
		expect((await api(rpcEvent("ping", undefined, 1, null))).status).toBe(401);
	});

	it("hides internal failures", async () => {
		const api = createTestApi(new FailingClient());
		const reply = await api(event({ path: "/tasks" }));
		expect(reply.status).toBe(500);
		expect(reply.raw).not.toContain("offline");
	});

	it("serves protected resource metadata without authentication", async () => {
		const reply = await createTestApi()(
			event({ path: "/.well-known/oauth-protected-resource", sub: null }),
		);
		expect(reply.body.resource).toBe("https://api.example.com/mcp");
		expect(reply.body.authorization_servers).toEqual([TEST_ISSUER]);
		expect(reply.body.bearer_methods_supported).toEqual(["header"]);
	});

	it("answers CORS preflight only for allowed origins", async () => {
		const api = createTestApi();
		const allowed = await api(
			event({ method: "OPTIONS", path: "/tasks", sub: null, headers: { origin: TEST_ORIGIN } }),
		);
		expect(allowed.status).toBe(204);
		expect(allowed.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
		expect(allowed.headers.get("access-control-allow-headers")).toContain("authorization");
		for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
			expect(allowed.headers.get("access-control-allow-methods")).toContain(method);
		}
		const denied = await api(
			event({
				method: "OPTIONS",
				path: "/tasks",
				sub: null,
				headers: { origin: "https://evil.example.com" },
			}),
		);
		expect(denied.headers.get("access-control-allow-origin")).toBeNull();
		expect(denied.status).not.toBe(204);
	});

	it("adds CORS headers to normal responses for allowed origins", async () => {
		const reply = await createTestApi()(
			event({ path: "/tasks", headers: { origin: TEST_ORIGIN } }),
		);
		expect(reply.status).toBe(200);
		expect(reply.headers.get("access-control-allow-origin")).toBe(TEST_ORIGIN);
		expect(reply.headers.get("vary")).toContain("Origin");
	});
});

describe("My Day", () => {
	it("stores the day a task was added and lets it be cleared", async () => {
		const api = createTestApi();
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "Sunny", myDay: "2026-11-19" } }),
		);
		expect(created.body.myDay).toBe("2026-11-19");
		const cleared = await api(
			event({ method: "PATCH", path: `/tasks/${created.body.id}`, body: { myDay: null } }),
		);
		expect(cleared.body.myDay).toBeNull();
		const plain = await api(event({ method: "POST", path: "/tasks", body: { title: "Plain" } }));
		expect(plain.body.myDay).toBeNull();
		const bad = await api(
			event({ method: "PATCH", path: `/tasks/${plain.body.id}`, body: { myDay: "today" } }),
		);
		expect(bad.status).toBe(400);
	});

	it("stores and clears the day the user removed a task from My Day", async () => {
		const api = createTestApi();
		const created = await api(
			event({
				method: "POST",
				path: "/tasks",
				body: { title: "Due", myDayDismissed: "2026-11-19" },
			}),
		);
		expect(created.body.myDayDismissed).toBe("2026-11-19");
		const cleared = await api(
			event({ method: "PATCH", path: `/tasks/${created.body.id}`, body: { myDayDismissed: null } }),
		);
		expect(cleared.body.myDayDismissed).toBeNull();
		const bad = await api(
			event({ method: "PATCH", path: `/tasks/${created.body.id}`, body: { myDayDismissed: "x" } }),
		);
		expect(bad.status).toBe(400);
	});

	it("stores a manual position and validates it", async () => {
		const api = createTestApi();
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "A", position: -5 } }),
		);
		expect(created.body.position).toBe(-5);
		const patch = (body: unknown) =>
			api(event({ method: "PATCH", path: `/tasks/${created.body.id}`, body }));
		expect((await patch({ position: 1.5 })).body.position).toBe(1.5);
		expect((await patch({ position: null })).body.position).toBeNull();
		expect((await patch({ position: "first" })).status).toBe(400);
	});

	it("round trips steps and notes over REST", async () => {
		const api = createTestApi();
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "Big job" } }),
		);
		expect(created.body.steps).toEqual([]);
		expect(created.body.note).toBe("");
		const patched = await api(
			event({
				method: "PATCH",
				path: `/tasks/${created.body.id}`,
				body: {
					steps: [{ id: "s1", title: "Start", completed: true }],
					note: "Line one\nLine two",
				},
			}),
		);
		expect(patched.body.steps).toEqual([{ id: "s1", title: "Start", completed: true }]);
		expect(patched.body.note).toBe("Line one\nLine two");
		const bad = await api(
			event({
				method: "PATCH",
				path: `/tasks/${created.body.id}`,
				body: { steps: [{ id: "s2" }] },
			}),
		);
		expect(bad.status).toBe(400);
	});

	it("is available to MCP clients", async () => {
		const api = createTestApi();
		const reply = await api(
			rpcEvent("tools/call", {
				name: "create_task",
				arguments: { title: "Via MCP", myDay: "2026-11-19" },
			}),
		);
		expect(JSON.parse(reply.body.result.content[0].text).myDay).toBe("2026-11-19");
	});
});

describe("Idempotent creation", () => {
	it("returns the existing task or list when a client id is replayed", async () => {
		const api = createTestApi();
		const post = (path: string, body: unknown) => api(event({ method: "POST", path, body }));
		const first = await post("/tasks", { id: "offline-1", title: "A" });
		const replay = await post("/tasks", { id: "offline-1", title: "A" });
		expect(first.status).toBe(201);
		expect(replay.body.id).toBe("offline-1");
		expect((await api(event({ path: "/tasks" }))).body.tasks).toHaveLength(1);
		await post("/lists", { id: "offline-list", name: "L" });
		await post("/lists", { id: "offline-list", name: "L" });
		expect((await api(event({ path: "/lists" }))).body.lists).toHaveLength(1);
		expect((await post("/tasks", { id: "bad id", title: "A" })).status).toBe(400);
	});
});

describe("Lists API", () => {
	it("reorders lists with PATCH position", async () => {
		const api = createTestApi();
		const a = (await api(event({ method: "POST", path: "/lists", body: { name: "A" } }))).body;
		const b = (await api(event({ method: "POST", path: "/lists", body: { name: "B" } }))).body;
		const moved = await api(
			event({ method: "PATCH", path: `/lists/${b.id}`, body: { position: a.position - 1 } }),
		);
		expect(moved.body.position).toBe(a.position - 1);
		const listed = (await api(event({ path: "/lists" }))).body.lists;
		expect(listed.map((list: { name: string }) => list.name)).toEqual(["B", "A"]);
		expect((await api(event({ method: "PATCH", path: `/lists/${b.id}`, body: {} }))).status).toBe(
			400,
		);
	});

	it("creates, reads, renames, lists and deletes a list", async () => {
		const api = createTestApi();
		const created = await api(event({ method: "POST", path: "/lists", body: { name: "Work" } }));
		expect(created.status).toBe(201);
		const id = created.body.id;
		expect((await api(event({ path: `/lists/${id}` }))).body.name).toBe("Work");
		const renamed = await api(
			event({ method: "PATCH", path: `/lists/${id}`, body: { name: "Home" } }),
		);
		expect(renamed.body.name).toBe("Home");
		expect((await api(event({ path: "/lists" }))).body.lists).toHaveLength(1);
		expect((await api(event({ method: "DELETE", path: `/lists/${id}` }))).status).toBe(204);
		expect((await api(event({ path: `/lists/${id}` }))).status).toBe(404);
	});

	it("validates list requests", async () => {
		const api = createTestApi();
		expect((await api(event({ method: "POST", path: "/lists", body: {} }))).status).toBe(400);
		expect(
			(await api(event({ method: "POST", path: "/lists", body: { name: "  " } }))).status,
		).toBe(400);
		expect(
			(await api(event({ method: "PATCH", path: "/lists/x", body: { name: "" } }))).status,
		).toBe(400);
		expect((await api(event({ path: "/lists", sub: null }))).status).toBe(401);
	});

	it("assigns tasks to lists, filters by list and cascades deletes", async () => {
		const api = createTestApi();
		const list = (await api(event({ method: "POST", path: "/lists", body: { name: "Work" } })))
			.body;
		const task = await api(
			event({ method: "POST", path: "/tasks", body: { title: "A", listId: list.id } }),
		);
		expect(task.body.listId).toBe(list.id);
		await api(event({ method: "POST", path: "/tasks", body: { title: "B" } }));
		expect((await api(event({ path: `/tasks?listId=${list.id}` }))).body.tasks).toHaveLength(1);
		expect((await api(event({ path: "/tasks" }))).body.tasks).toHaveLength(2);
		const missing = await api(
			event({ method: "POST", path: "/tasks", body: { title: "C", listId: "nope" } }),
		);
		expect(missing.status).toBe(400);
		await api(event({ method: "DELETE", path: `/lists/${list.id}` }));
		expect((await api(event({ path: "/tasks" }))).body.tasks).toHaveLength(1);
	});

	it("isolates lists between users", async () => {
		const api = createTestApi();
		const list = (
			await api(event({ method: "POST", path: "/lists", body: { name: "Mine" }, sub: "alice" }))
		).body;
		expect((await api(event({ path: `/lists/${list.id}`, sub: "bob" }))).status).toBe(404);
	});
});

describe("MCP over HTTP", () => {
	it("shares tasks with the REST API", async () => {
		const api = createTestApi();
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "From REST" } }),
		);
		const viaMcp = await api(
			rpcEvent("tools/call", { name: "complete_task", arguments: { id: created.body.id } }),
		);
		expect(viaMcp.body.result.isError).toBe(false);
		expect((await api(event({ path: `/tasks/${created.body.id}` }))).body.completed).toBe(true);
	});

	it("acknowledges notifications and reports parse errors", async () => {
		const api = createTestApi();
		expect((await api(rpcEvent("notifications/initialized", undefined, null))).status).toBe(202);
		const empty = await api(
			event({ method: "POST", path: "/mcp", rawBody: "", contentType: "text/plain" }),
		);
		expect(empty.body.error.code).toBe(-32700);
		const bare = await api(event({ method: "POST", path: "/mcp" }));
		expect(bare.body.error.code).toBe(-32700);
	});

	it("rejects non-POST methods", async () => {
		expect((await createTestApi()(event({ path: "/mcp" }))).status).toBe(405);
	});

	it("surfaces unexpected tool failures as 500", async () => {
		const api = createTestApi(new FailingClient());
		expect((await api(rpcEvent("tools/call", { name: "list_tasks" }))).status).toBe(500);
	});
});

describe("performance", () => {
	it("handles 100 sequential creates and a full listing quickly", async () => {
		const api = createTestApi();
		const started = performance.now();
		for (let i = 0; i < 100; i += 1) {
			await api(event({ method: "POST", path: "/tasks", body: { title: `T${i}` } }));
		}
		expect((await api(event({ path: "/tasks" }))).body.tasks).toHaveLength(100);
		expect(performance.now() - started).toBeLessThan(5000);
	});
});

describe("View settings API", () => {
	const settings = (body: unknown, id = "my-day", sub = "user-1") =>
		event({ method: "PUT", path: `/view-settings/${id}`, body, sub });

	it("stores and lists settings per view", async () => {
		const api = createTestApi();
		const put = await api(
			settings({
				sort: "importance",
				hideCompleted: true,
				theme: { type: "color", color: "#2564cf" },
			}),
		);
		expect(put.status).toBe(200);
		expect(put.body).toMatchObject({
			id: "my-day",
			sort: "importance",
			sortDescending: false,
			hideCompleted: true,
		});
		const reversed = await api(
			settings({ sort: "due", sortDescending: true, hideCompleted: false, theme: null }, "rev"),
		);
		expect(reversed.body.sortDescending).toBe(true);
		expect(
			(
				await api(
					settings(
						{ sort: "due", sortDescending: "yes", hideCompleted: false, theme: null },
						"bad",
					),
				)
			).status,
		).toBe(400);
		await api(settings({ sort: null, hideCompleted: false, theme: null }, "list-1"));
		const listed = await api(event({ path: "/view-settings" }));
		expect(listed.body.settings.map((entry: { id: string }) => entry.id)).toEqual([
			"list-1",
			"my-day",
			"rev",
		]);
		expect(
			(await api(event({ path: "/view-settings", sub: "someone-else" }))).body.settings,
		).toEqual([]);
	});

	it("validates the body and the user", async () => {
		const api = createTestApi();
		expect(
			(await api(settings({ sort: "random", hideCompleted: false, theme: null }))).status,
		).toBe(400);
		expect((await api(settings({ sort: null, hideCompleted: false }))).status).toBe(400);
		expect(
			(
				await api(
					settings({ sort: null, hideCompleted: false, theme: { type: "color", color: "nope" } }),
				)
			).status,
		).toBe(400);
		expect(
			(
				await api(
					settings({
						sort: null,
						hideCompleted: false,
						theme: { type: "photo", photoId: "ghost" },
					}),
				)
			).status,
		).toBe(400);
		expect((await api(event({ path: "/view-settings", sub: null }))).status).toBe(401);
	});

	it("accepts a preset photo theme and returns it", async () => {
		const api = createTestApi();
		const theme = { type: "preset", presetId: "aurora" };
		const saved = await api(settings({ sort: null, hideCompleted: false, theme }));
		expect(saved.status).toBe(200);
		expect(saved.body.theme).toEqual(theme);
		const listed = await api(event({ path: "/view-settings" }));
		expect(listed.body.settings[0].theme).toEqual(theme);
	});

	it("removes a list's settings when the list is deleted", async () => {
		const api = createTestApi();
		const list = (await api(event({ method: "POST", path: "/lists", body: { name: "Temp" } })))
			.body;
		await api(settings({ sort: "due", hideCompleted: false, theme: null }, list.id));
		await api(event({ method: "DELETE", path: `/lists/${list.id}` }));
		expect((await api(event({ path: "/view-settings" }))).body.settings).toEqual([]);
	});
});

describe("Photos API", () => {
	const create = (api: ReturnType<typeof createTestApi>, body: unknown = {}, sub = "user-1") =>
		api(
			event({
				method: "POST",
				path: "/photos",
				body: { name: "Beach", contentType: "image/jpeg", size: 2048, ...(body as object) },
				sub,
			}),
		);

	it("creates a photo with a signed upload, lists it and deletes it for good", async () => {
		const api = createTestApi();
		const created = await create(api);
		expect(created.status).toBe(201);
		expect(created.body.photo).toMatchObject({
			name: "Beach",
			contentType: "image/jpeg",
			size: 2048,
		});
		expect(created.body.photo.url).toContain("https://photos.test/user-1/");
		expect(created.body.upload.url).toBe("https://upload.test/photos");
		expect(created.body.upload.fields["Content-Type"]).toBe("image/jpeg");
		const listed = await api(event({ path: "/photos" }));
		expect(listed.body.photos).toHaveLength(1);
		expect((await api(event({ path: "/photos", sub: "someone-else" }))).body.photos).toEqual([]);
		const removed = await api(
			event({ method: "DELETE", path: `/photos/${created.body.photo.id}` }),
		);
		expect(removed.status).toBe(204);
		expect((await api(event({ path: "/photos" }))).body.photos).toEqual([]);
		expect(
			(await api(event({ method: "DELETE", path: `/photos/${created.body.photo.id}` }))).status,
		).toBe(404);
	});

	it("rejects unsupported or oversized photos", async () => {
		const api = createTestApi();
		expect((await create(api, { contentType: "image/gif" })).status).toBe(400);
		expect((await create(api, { size: 6 * 1024 * 1024 })).status).toBe(400);
		expect((await create(api, { size: 0 })).status).toBe(400);
		expect((await create(api, { name: "" })).status).toBe(400);
		expect(
			(await api(event({ method: "POST", path: "/photos", body: {}, sub: null }))).status,
		).toBe(401);
	});

	it("lets a photo be used as a theme and clears the theme when the photo is deleted", async () => {
		const api = createTestApi();
		const created = await create(api);
		const photoId = created.body.photo.id;
		const themed = await api(
			event({
				method: "PUT",
				path: "/view-settings/my-day",
				body: { sort: null, hideCompleted: false, theme: { type: "photo", photoId } },
			}),
		);
		expect(themed.body.theme).toEqual({ type: "photo", photoId });
		await api(event({ method: "DELETE", path: `/photos/${photoId}` }));
		const after = await api(event({ path: "/view-settings" }));
		expect(after.body.settings[0].theme).toBeNull();
	});

	it("uploads, lists and deletes a task's attachments", async () => {
		const api = createTestApi();
		const task = await api(event({ method: "POST", path: "/tasks", body: { title: "Task" } }));
		const base = `/tasks/${task.body.id}/attachments`;
		const created = await api(
			event({
				method: "POST",
				path: base,
				body: { name: "Report.pdf", contentType: "application/pdf", size: 2048 },
			}),
		);
		expect(created.status).toBe(201);
		expect(created.body.attachment).toMatchObject({ name: "Report.pdf", taskId: task.body.id });
		expect(created.body.upload.url).toBe("https://upload.test/photos");
		const listed = await api(event({ path: base }));
		expect(listed.body.attachments).toHaveLength(1);
		const flag = async () => {
			const one = await api(event({ path: `/tasks/${task.body.id}` }));
			const all = await api(event({ path: "/tasks" }));
			expect(all.body.tasks[0].hasAttachments).toBe(one.body.hasAttachments);
			return one.body.hasAttachments;
		};
		expect(task.body.hasAttachments).toBe(false);
		expect(await flag()).toBe(true);
		const patched = await api(
			event({ method: "PATCH", path: `/tasks/${task.body.id}`, body: { completed: true } }),
		);
		expect(patched.body.hasAttachments).toBe(true);
		const removed = await api(
			event({ method: "DELETE", path: `${base}/${created.body.attachment.id}` }),
		);
		expect(removed.status).toBe(204);
		expect((await api(event({ path: base }))).body.attachments).toEqual([]);
		expect(await flag()).toBe(false);
		expect((await api(event({ path: base, sub: "someone-else" }))).status).toBe(404);
		expect(
			(
				await api(
					event({ method: "POST", path: base, body: { name: "", contentType: "x", size: 1 } }),
				)
			).status,
		).toBe(400);
	});
});
