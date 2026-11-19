import { HttpResponses, type HttpEvent, type HttpResult, type RouteHandler } from "./types";

export class DiscoveryHandler implements RouteHandler {
	constructor(private readonly issuer: string) {}

	canHandle(path: string): boolean {
		return path === "/.well-known/oauth-protected-resource";
	}

	async handle(event: HttpEvent): Promise<HttpResult> {
		return HttpResponses.json(200, {
			resource: `https://${event.requestContext.domainName}/mcp`,
			authorization_servers: [this.issuer],
			bearer_methods_supported: ["header"],
		});
	}
}
