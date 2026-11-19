import { describe, expect, it } from "vitest";
import { createApi } from "../src/bootstrap";
import { FakeDocumentClient } from "./support/fake-document-client";
import { event, rpc } from "./support/events";

function api() {
	return createApi(
		{ tableName: "t", issuer: "https://issuer" },
		new FakeDocumentClient(2).asClient(),
	);
}

describe("API end to end", () => {
	it("lets REST and MCP share the same tasks", async () => {
		const router = api();
		const created = await router.handle(
			event({ method: "POST", path: "/tasks", body: { title: "From REST" } }),
		);
		const id = JSON.parse(created.body).id;
		const viaMcp = await router.handle(
			rpc("tools/call", { name: "complete_task", arguments: { id } }),
		);
		expect(JSON.parse(viaMcp.body).result.isError).toBe(false);
		const fetched = await router.handle(event({ path: `/tasks/${id}` }));
		expect(JSON.parse(fetched.body).completed).toBe(true);
	});

	it("isolates users from one another", async () => {
		const router = api();
		const created = await router.handle(
			event({ method: "POST", path: "/tasks", body: { title: "Private" }, sub: "alice" }),
		);
		const id = JSON.parse(created.body).id;
		expect((await router.handle(event({ path: `/tasks/${id}`, sub: "bob" }))).statusCode).toBe(404);
		expect(
			JSON.parse((await router.handle(event({ path: "/tasks", sub: "bob" }))).body).tasks,
		).toEqual([]);
	});

	it("rejects unauthenticated requests", async () => {
		const router = api();
		expect((await router.handle(event({ path: "/tasks", sub: null }))).statusCode).toBe(401);
		expect((await router.handle(rpc("ping", undefined, 1, null))).statusCode).toBe(401);
	});

	it("performance: handles 200 sequential creates quickly", async () => {
		const router = api();
		const started = performance.now();
		for (let i = 0; i < 200; i += 1) {
			await router.handle(event({ method: "POST", path: "/tasks", body: { title: `T${i}` } }));
		}
		const listed = await router.handle(event({ path: "/tasks" }));
		expect(JSON.parse(listed.body).tasks).toHaveLength(200);
		expect(performance.now() - started).toBeLessThan(2000);
	});
});
