import type { RequestHandler } from "express";

export class CorsPolicy {
	constructor(private readonly allowedOrigins: readonly string[]) {}

	middleware(): RequestHandler {
		return (request, response, next) => {
			const origin = request.header("origin");
			if (origin === undefined || !this.allowedOrigins.includes(origin)) {
				next();
				return;
			}
			response.setHeader("access-control-allow-origin", origin);
			response.setHeader("vary", "Origin");
			if (request.method !== "OPTIONS") {
				next();
				return;
			}
			response.setHeader("access-control-allow-methods", "GET, POST, PATCH, DELETE, OPTIONS");
			response.setHeader("access-control-allow-headers", "authorization, content-type");
			response.setHeader("access-control-max-age", "3600");
			response.status(204).end();
		};
	}
}
