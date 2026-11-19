export interface EventOptions {
	readonly method?: string;
	readonly path: string;
	readonly body?: unknown;
	readonly rawBody?: string;
	readonly base64?: boolean;
	readonly sub?: string | null;
	readonly contentType?: string;
}

export function event(options: EventOptions): Record<string, unknown> {
	const sub = options.sub === undefined ? "user-1" : options.sub;
	const method = options.method ?? "GET";
	const [path = "", query = ""] = options.path.split("?");
	const rawBody =
		options.rawBody ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
	const headers: Record<string, string> = { host: "api.example.com" };
	if (rawBody !== undefined) {
		headers["content-type"] = options.contentType ?? "application/json";
	}
	return {
		version: "2.0",
		routeKey: "$default",
		rawPath: path,
		rawQueryString: query,
		headers,
		requestContext: {
			accountId: "1",
			apiId: "api",
			domainName: "api.example.com",
			domainPrefix: "api",
			http: {
				method,
				path,
				protocol: "HTTP/1.1",
				sourceIp: "127.0.0.1",
				userAgent: "vitest",
			},
			requestId: "request",
			routeKey: "$default",
			stage: "$default",
			time: "01/Jan/2026:00:00:00 +0000",
			timeEpoch: 0,
			authorizer: sub === null ? undefined : { jwt: { claims: { sub }, scopes: null } },
		},
		body:
			options.base64 && rawBody !== undefined ? Buffer.from(rawBody).toString("base64") : rawBody,
		isBase64Encoded: options.base64 ?? false,
	};
}

export function rpcEvent(
	method: string,
	params?: unknown,
	id: number | null = 1,
	sub?: string | null,
): Record<string, unknown> {
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
