import { Router } from "express";

export class DiscoveryController {
	constructor(
		private readonly issuer: string,
		private readonly publicUrl: string,
	) {}

	router(): Router {
		const router = Router();
		router.get("/.well-known/oauth-protected-resource", (_request, response) => {
			response.json({
				resource: `${this.publicUrl}/mcp`,
				authorization_servers: [this.issuer],
				bearer_methods_supported: ["header"],
			});
		});
		return router;
	}
}
