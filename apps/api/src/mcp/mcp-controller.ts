import express, { Router } from "express";
import { RouteSupport } from "../http/route-support";
import type { McpServer } from "./mcp-server";

export class McpController {
	constructor(private readonly server: McpServer) {}

	router(): Router {
		const router = Router();
		router.post(
			"/",
			express.text({ type: () => true }),
			RouteSupport.wrap(async (request, response) => {
				const text = String(request.body);
				const reply = await this.server.process(RouteSupport.ownerOf(response), text);
				if (reply === null) {
					response.status(202).end();
					return;
				}
				response.json(reply);
			}),
		);
		return router;
	}
}
