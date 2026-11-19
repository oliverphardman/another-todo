import { describe, expect, it } from "vitest";
import { MethodNotAllowedError, UnauthorizedError } from "../src/domain/errors";
import { McpHandler } from "../src/mcp/mcp-handler";
import { createTools } from "../src/mcp/tools";
import { event, rpc } from "./support/events";
import { createService } from "./support/fixtures";

function handler(): McpHandler {
	return new McpHandler(createTools(createService()));
}

async function call(h: McpHandler, name: string, args?: unknown) {
	const result = await h.handle(rpc("tools/call", { name, arguments: args }));
	return JSON.parse(result.body).result;
}

describe("McpHandler", () => {
	it("matches only /mcp", () => {
		expect(handler().canHandle("/mcp")).toBe(true);
		expect(handler().canHandle("/tasks")).toBe(false);
	});

	it("initializes, pings and lists tools", async () => {
		const h = handler();
		expect(JSON.parse((await h.handle(rpc("initialize"))).body).result.serverInfo.name).toBe(
			"another-todo",
		);
		expect(JSON.parse((await h.handle(rpc("ping"))).body).result).toEqual({});
		const tools = JSON.parse((await h.handle(rpc("tools/list"))).body).result.tools;
		expect(tools.map((tool: { name: string }) => tool.name)).toEqual([
			"list_tasks",
			"get_task",
			"create_task",
			"update_task",
			"complete_task",
			"delete_task",
		]);
	});

	it("acknowledges notifications with 202", async () => {
		const result = await handler().handle(rpc("notifications/initialized", undefined, null));
		expect(result.statusCode).toBe(202);
	});

	it("reports errors for notifications with a null id", async () => {
		const result = await handler().handle(rpc("nope", undefined, null));
		expect(JSON.parse(result.body).id).toBeNull();
	});

	it("drives the full tool lifecycle", async () => {
		const h = handler();
		const created = await call(h, "create_task", { title: "A" });
		expect(created.isError).toBe(false);
		const id = JSON.parse(created.content[0].text).id;
		expect(JSON.parse((await call(h, "get_task", { id })).content[0].text).title).toBe("A");
		const updated = await call(h, "update_task", { id, title: "B", importance: "high" });
		expect(JSON.parse(updated.content[0].text).importance).toBe("high");
		const completed = await call(h, "complete_task", { id });
		expect(JSON.parse(completed.content[0].text).completed).toBe(true);
		expect(JSON.parse((await call(h, "list_tasks")).content[0].text)).toHaveLength(1);
		expect(JSON.parse((await call(h, "delete_task", { id })).content[0].text)).toEqual({
			deleted: true,
		});
		expect((await call(h, "get_task", { id })).isError).toBe(true);
	});

	it("reports domain errors as tool errors", async () => {
		const h = handler();
		const missingId = await call(h, "get_task", {});
		expect(missingId).toEqual({
			content: [{ type: "text", text: "id is required" }],
			isError: true,
		});
		expect((await call(h, "get_task", { id: "" })).isError).toBe(true);
		expect((await call(h, "create_task", { title: 1 })).isError).toBe(true);
	});

	it("returns JSON-RPC errors", async () => {
		const h = handler();
		const code = async (e: ReturnType<typeof event>) =>
			JSON.parse((await h.handle(e)).body).error.code;
		expect(await code(rpc("nope"))).toBe(-32601);
		expect(await code(rpc("tools/call", { name: "nope" }))).toBe(-32602);
		expect(await code(rpc("tools/call"))).toBe(-32602);
		expect(await code(rpc("tools/call", { name: "list_tasks", arguments: [] }))).toBe(-32602);
		expect(await code(rpc("tools/call", { name: "list_tasks", arguments: "x" }))).toBe(-32602);
		expect(await code(rpc("tools/call", { name: 5 }))).toBe(-32602);
		expect(await code(event({ method: "POST", path: "/mcp", rawBody: "{" }))).toBe(-32700);
		for (const rawBody of [
			"[]",
			"null",
			"3",
			'{"jsonrpc":"1.0","method":"ping"}',
			'{"jsonrpc":"2.0"}',
		]) {
			expect(await code(event({ method: "POST", path: "/mcp", rawBody }))).toBe(-32600);
		}
	});

	it("rethrows unexpected errors", async () => {
		const service = createService();
		service.list = async () => {
			throw new Error("boom");
		};
		const h = new McpHandler(createTools(service));
		await expect(h.handle(rpc("tools/call", { name: "list_tasks" }))).rejects.toThrow("boom");
	});

	it("requires POST and authentication", async () => {
		const h = handler();
		await expect(h.handle(event({ method: "GET", path: "/mcp" }))).rejects.toThrow(
			MethodNotAllowedError,
		);
		await expect(h.handle(rpc("ping", undefined, 1, null))).rejects.toThrow(UnauthorizedError);
	});
});
