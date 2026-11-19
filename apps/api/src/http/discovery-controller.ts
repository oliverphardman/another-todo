import { Router } from "express";

export class DiscoveryController {
	constructor(private readonly issuer: string) {}

	router(): Router {
		const router = Router();
		router.get("/.well-known/oauth-protected-resource", (request, response) => {
			response.json({
				resource: `https://${request.hostname}/mcp`,
				authorization_servers: [this.issuer],
				bearer_methods_supported: ["header"],
			});
		});
		return router;
	}
}
