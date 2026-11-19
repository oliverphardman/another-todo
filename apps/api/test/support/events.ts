import type { HttpEvent } from "../../src/http/types";

export interface EventOptions {
	readonly method?: string;
	readonly path: string;
	readonly body?: unknown;
	readonly rawBody?: string;
	readonly base64?: boolean;
	readonly sub?: string | null;
}

export function event(options: EventOptions): HttpEvent {
	const sub = options.sub === undefined ? "user-1" : options.sub;
	const rawBody =
		options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
	return {
		rawPath: options.path,
		body:
			options.base64 && rawBody !== undefined ? Buffer.from(rawBody).toString("base64") : rawBody,
		isBase64Encoded: options.base64 ?? false,
		requestContext: {
			domainName: "api.example.com",
			http: { method: options.method ?? "GET" },
			authorizer: sub === null ? undefined : { jwt: { claims: { sub } } },
		},
	};
}

export function rpc(
	method: string,
	params?: unknown,
	id: number | null = 1,
	sub?: string | null,
): HttpEvent {
	return event({
		method: "POST",
		path: "/mcp",
		sub,
		body: id === null ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id, method, params },
	});
}
