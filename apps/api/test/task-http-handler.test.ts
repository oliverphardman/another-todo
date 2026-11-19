import { describe, expect, it } from "vitest";
import { MethodNotAllowedError, UnauthorizedError, ValidationError } from "../src/domain/errors";
import { TaskHttpHandler } from "../src/http/task-http-handler";
import { event } from "./support/events";
import { createService } from "./support/fixtures";

function handler(): TaskHttpHandler {
	return new TaskHttpHandler(createService());
}

describe("TaskHttpHandler", () => {
	it("matches task paths only", () => {
		const h = handler();
		expect(h.canHandle("/tasks")).toBe(true);
		expect(h.canHandle("/tasks/1")).toBe(true);
		expect(h.canHandle("/tasks/1/x")).toBe(false);
		expect(h.canHandle("/other")).toBe(false);
	});

	it("creates, reads, updates, lists and deletes", async () => {
		const h = handler();
		const created = await h.handle(event({ method: "POST", path: "/tasks", body: { title: "A" } }));
		expect(created.statusCode).toBe(201);
		const id = JSON.parse(created.body).id;
		expect((await h.handle(event({ path: `/tasks/${id}` }))).statusCode).toBe(200);
		const patched = await h.handle(
			event({ method: "PATCH", path: `/tasks/${id}`, body: { completed: true } }),
		);
		expect(JSON.parse(patched.body).completed).toBe(true);
		const listed = await h.handle(event({ path: "/tasks" }));
		expect(JSON.parse(listed.body).tasks).toHaveLength(1);
		const removed = await h.handle(event({ method: "DELETE", path: `/tasks/${id}` }));
		expect(removed).toEqual({ statusCode: 204, headers: {}, body: "" });
	});

	it("decodes base64 bodies", async () => {
		const result = await handler().handle(
			event({ method: "POST", path: "/tasks", body: { title: "A" }, base64: true }),
		);
		expect(result.statusCode).toBe(201);
	});

	it("rejects malformed bodies", async () => {
		const h = handler();
		for (const rawBody of ["{", "[]", "null", "3", undefined]) {
			await expect(h.handle(event({ method: "POST", path: "/tasks", rawBody }))).rejects.toThrow(
				ValidationError,
			);
		}
	});

	it("rejects unsupported methods", async () => {
		const h = handler();
		await expect(h.handle(event({ method: "PUT", path: "/tasks" }))).rejects.toThrow(
			MethodNotAllowedError,
		);
		await expect(h.handle(event({ method: "PUT", path: "/tasks/1" }))).rejects.toThrow(
			MethodNotAllowedError,
		);
	});

	it("requires authentication", async () => {
		await expect(handler().handle(event({ path: "/tasks", sub: null }))).rejects.toThrow(
			UnauthorizedError,
		);
		await expect(handler().handle(event({ path: "/tasks", sub: "" }))).rejects.toThrow(
			UnauthorizedError,
		);
	});
});
