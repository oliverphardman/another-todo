export interface ApiRequest {
	readonly method: string;
	readonly path: string;
	readonly headers: Record<string, string>;
	readonly body?: string;
}

export interface EventOptions {
	readonly method?: string;
	readonly path: string;
	readonly body?: unknown;
	readonly rawBody?: string;
	readonly sub?: string | null;
	readonly contentType?: string;
	readonly headers?: Record<string, string>;
}

export function event(options: EventOptions): ApiRequest {
	const sub = options.sub === undefined ? "user-1" : options.sub;
	const body =
		options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
	const headers: Record<string, string> = { ...options.headers };
	if (sub !== null) {
		headers.authorization = `Bearer ${sub}`;
	}
	if (body !== undefined) {
		headers["content-type"] = options.contentType ?? "application/json";
	}
	return { method: options.method ?? "GET", path: options.path, headers, body };
}

export function rpcEvent(
	method: string,
	params?: unknown,
	id: number | null = 1,
	sub?: string | null,
): ApiRequest {
	return event({
		method: "POST",
		path: "/mcp",
		sub,
		body: id === null ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params },
	});
}

export function rpcText(method: string, params?: unknown, id: number | null = 1): string {
	return JSON.stringify(
		id === null ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params },
	);
}
