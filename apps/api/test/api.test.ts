import { describe, expect, it } from "vitest";
import { FailingClient } from "./support/fake-document-client";
import { event, rpcEvent } from "./support/events";
import { createTestApi } from "./support/test-api";

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

	it("accepts base64 encoded bodies", async () => {
		const api = createTestApi();
		const created = await api(
			event({ method: "POST", path: "/tasks", body: { title: "A" }, base64: true }),
		);
		expect(created.status).toBe(201);
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
		expect(reply.body).toEqual({
			resource: "https://api.example.com/mcp",
			authorization_servers: ["https://issuer.example.com"],
			bearer_methods_supported: ["header"],
		});
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
