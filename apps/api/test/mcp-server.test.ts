import { describe, expect, it } from "vitest";
import { McpServer } from "../src/mcp/mcp-server";
import { createTools } from "../src/mcp/tools";
import { rpcText } from "./support/events";
import { createServices } from "./support/fixtures";

function server(): McpServer {
	const { tasks, lists } = createServices();
	return new McpServer(createTools(tasks, lists));
}

async function call(s: McpServer, name: string, args?: unknown) {
	const reply = await s.process("u", rpcText("tools/call", { name, arguments: args }));
	return (reply as { result: any }).result;
}

async function code(s: McpServer, text: string) {
	return ((await s.process("u", text)) as { error: { code: number } }).error.code;
}

describe("McpServer", () => {
	it("initializes, pings and lists tools", async () => {
		const s = server();
		const init = (await s.process("u", rpcText("initialize"))) as { result: any };
		expect(init.result.serverInfo.name).toBe("another-todo");
		expect(await s.process("u", rpcText("ping"))).toEqual({ jsonrpc: "2.0", id: 1, result: {} });
		const listed = (await s.process("u", rpcText("tools/list"))) as { result: any };
		expect(listed.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
			"list_tasks",
			"get_task",
			"create_task",
			"update_task",
			"complete_task",
			"delete_task",
			"list_lists",
			"create_list",
			"rename_list",
			"delete_list",
		]);
	});

	it("returns null for successful notifications", async () => {
		expect(
			await server().process("u", rpcText("notifications/initialized", undefined, null)),
		).toBeNull();
	});

	it("reports errors for notifications with a null id", async () => {
		const reply = await server().process("u", rpcText("nope", undefined, null));
		expect(reply).toMatchObject({ id: null, error: { code: -32601 } });
	});

	it("drives the full tool lifecycle", async () => {
		const s = server();
		const created = await call(s, "create_task", { title: "A" });
		expect(created.isError).toBe(false);
		const id = JSON.parse(created.content[0].text).id;
		expect(JSON.parse((await call(s, "get_task", { id })).content[0].text).title).toBe("A");
		const updated = await call(s, "update_task", { id, title: "B", importance: "high" });
		expect(JSON.parse(updated.content[0].text).importance).toBe("high");
		const completed = await call(s, "complete_task", { id });
		expect(JSON.parse(completed.content[0].text).completed).toBe(true);
		expect(JSON.parse((await call(s, "list_tasks")).content[0].text)).toHaveLength(1);
		expect(JSON.parse((await call(s, "delete_task", { id })).content[0].text)).toEqual({
			deleted: true,
		});
		expect((await call(s, "get_task", { id })).isError).toBe(true);
	});

	it("manages lists and filters tasks by list", async () => {
		const s = server();
		const list = JSON.parse((await call(s, "create_list", { name: "Work" })).content[0].text);
		const task = JSON.parse(
			(await call(s, "create_task", { title: "A", listId: list.id })).content[0].text,
		);
		await call(s, "create_task", { title: "B" });
		expect(task.listId).toBe(list.id);
		const filtered = await call(s, "list_tasks", { listId: list.id });
		expect(JSON.parse(filtered.content[0].text)).toHaveLength(1);
		expect(JSON.parse((await call(s, "list_tasks", {})).content[0].text)).toHaveLength(2);
		const renamed = await call(s, "rename_list", { id: list.id, name: "Home" });
		expect(JSON.parse(renamed.content[0].text).name).toBe("Home");
		expect(JSON.parse((await call(s, "list_lists")).content[0].text)).toHaveLength(1);
		expect(JSON.parse((await call(s, "delete_list", { id: list.id })).content[0].text)).toEqual({
			deleted: true,
		});
		expect(JSON.parse((await call(s, "list_tasks", {})).content[0].text)).toHaveLength(1);
		expect((await call(s, "create_list", {})).isError).toBe(true);
		expect((await call(s, "delete_list", {})).isError).toBe(true);
	});

	it("reports domain errors as tool errors", async () => {
		const s = server();
		expect(await call(s, "get_task", {})).toEqual({
			content: [{ type: "text", text: "id is required" }],
			isError: true,
		});
		expect((await call(s, "get_task", { id: "" })).isError).toBe(true);
		expect((await call(s, "create_task", { title: 1 })).isError).toBe(true);
	});

	it("returns JSON-RPC errors", async () => {
		const s = server();
		expect(await code(s, rpcText("nope"))).toBe(-32601);
		expect(await code(s, rpcText("tools/call", { name: "nope" }))).toBe(-32602);
		expect(await code(s, rpcText("tools/call"))).toBe(-32602);
		expect(await code(s, rpcText("tools/call", { name: "list_tasks", arguments: [] }))).toBe(
			-32602,
		);
		expect(await code(s, rpcText("tools/call", { name: "list_tasks", arguments: "x" }))).toBe(
			-32602,
		);
		expect(await code(s, rpcText("tools/call", { name: "list_tasks", arguments: null }))).toBe(
			-32602,
		);
		expect(await code(s, rpcText("tools/call", { name: 5 }))).toBe(-32602);
		expect(await code(s, "{")).toBe(-32700);
		for (const text of [
			"[]",
			"null",
			"3",
			'{"jsonrpc":"1.0","method":"ping"}',
			'{"jsonrpc":"2.0"}',
		]) {
			expect(await code(s, text)).toBe(-32600);
		}
	});

	it("rethrows unexpected errors", async () => {
		const { tasks, lists } = createServices();
		tasks.list = async () => {
			throw new Error("boom");
		};
		const s = new McpServer(createTools(tasks, lists));
		await expect(s.process("u", rpcText("tools/call", { name: "list_tasks" }))).rejects.toThrow(
			"boom",
		);
	});
});
