import packageJson from "../../package.json";
import { DomainError } from "../domain/errors";
import type { McpTool, ToolArguments } from "./tools";

const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;

type RpcId = string | number | null;

export type McpResponse = Record<string, unknown>;

interface RpcRequest {
	readonly id?: RpcId;
	readonly method: string;
	readonly params?: unknown;
}

class RpcError extends Error {
	constructor(
		readonly code: number,
		message: string,
	) {
		super(message);
	}
}

export class McpServer {
	private readonly tools: ReadonlyMap<string, McpTool>;

	constructor(tools: readonly McpTool[]) {
		this.tools = new Map(tools.map((tool) => [tool.name, tool]));
	}

	async process(ownerId: string, text: string): Promise<McpResponse | null> {
		let request: RpcRequest;
		try {
			request = McpServer.parse(text);
		} catch (error) {
			return McpServer.failure(null, error as RpcError);
		}
		try {
			const result = await this.dispatch(ownerId, request);
			return request.id === undefined ? null : { jsonrpc: "2.0", id: request.id, result };
		} catch (error) {
			if (error instanceof RpcError) {
				return McpServer.failure(request.id ?? null, error);
			}
			throw error;
		}
	}

	private static parse(text: string): RpcRequest {
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch {
			throw new RpcError(PARSE_ERROR, "Parse error");
		}
		const candidate = parsed as Partial<RpcRequest> & { jsonrpc?: unknown };
		if (
			typeof parsed !== "object" ||
			parsed === null ||
			Array.isArray(parsed) ||
			candidate.jsonrpc !== "2.0" ||
			typeof candidate.method !== "string"
		) {
			throw new RpcError(INVALID_REQUEST, "Invalid request");
		}
		return candidate as RpcRequest;
	}

	private static failure(id: RpcId, error: RpcError): McpResponse {
		return { jsonrpc: "2.0", id, error: { code: error.code, message: error.message } };
	}

	private async dispatch(ownerId: string, request: RpcRequest): Promise<unknown> {
		switch (request.method) {
			case "initialize":
				return {
					protocolVersion: "2025-03-26",
					capabilities: { tools: {} },
					serverInfo: { name: "another-todo", version: packageJson.version },
				};
			case "notifications/initialized":
			case "ping":
				return {};
			case "tools/list":
				return {
					tools: [...this.tools.values()].map((tool) => ({
						name: tool.name,
						description: tool.description,
						inputSchema: tool.inputSchema,
					})),
				};
			case "tools/call":
				return this.callTool(ownerId, request.params);
			default:
				throw new RpcError(METHOD_NOT_FOUND, `Method not found: ${request.method}`);
		}
	}

	private async callTool(ownerId: string, params: unknown): Promise<unknown> {
		const { name, arguments: args = {} } = (params ?? {}) as {
			name?: unknown;
			arguments?: unknown;
		};
		const tool = typeof name === "string" ? this.tools.get(name) : undefined;
		if (tool === undefined) {
			throw new RpcError(INVALID_PARAMS, "Unknown tool");
		}
		if (typeof args !== "object" || args === null || Array.isArray(args)) {
			throw new RpcError(INVALID_PARAMS, "arguments must be an object");
		}
		try {
			const output = await tool.execute(ownerId, args as ToolArguments);
			return { content: [{ type: "text", text: JSON.stringify(output) }], isError: false };
		} catch (error) {
			if (error instanceof DomainError) {
				return { content: [{ type: "text", text: error.message }], isError: true };
			}
			throw error;
		}
	}
}
