import { existsSync } from "node:fs";
import { join } from "node:path";
import express, { Router, type NextFunction, type Request, type Response } from "express";

export interface WebRuntimeConfig {
	readonly serverUrl: string;
	readonly enforced: boolean;
}

const API_PREFIXES = [
	"/tasks",
	"/lists",
	"/groups",
	"/view-settings",
	"/photos",
	"/mcp",
	"/media",
	"/config",
	"/realtime",
	"/.well-known",
];

export class WebHost {
	constructor(
		private readonly directory: string,
		private readonly runtime: WebRuntimeConfig,
	) {}

	router(): Router {
		const router = Router();
		router.get("/runtime-config.js", (_request, response) => {
			response
				.type("application/javascript")
				.set("Cache-Control", "no-store")
				.send(`window.__ATD_CONFIG__ = ${JSON.stringify(this.runtime)};`);
		});
		router.use(express.static(this.directory, { index: false }));
		router.get("*", (request: Request, response: Response, next: NextFunction) => {
			const index = join(this.directory, "index.html");
			if (API_PREFIXES.some((prefix) => request.path.startsWith(prefix)) || !existsSync(index)) {
				next();
				return;
			}
			response.sendFile(index);
		});
		return router;
	}
}
