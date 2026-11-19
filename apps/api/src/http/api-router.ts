import {
	MethodNotAllowedError,
	NotFoundError,
	UnauthorizedError,
	ValidationError,
} from "../domain/errors";
import { HttpResponses, type HttpEvent, type HttpResult, type RouteHandler } from "./types";

export class ApiRouter {
	constructor(private readonly handlers: readonly RouteHandler[]) {}

	async handle(event: HttpEvent): Promise<HttpResult> {
		const handler = this.handlers.find((candidate) => candidate.canHandle(event.rawPath));
		if (handler === undefined) {
			return HttpResponses.json(404, { error: "Not found" });
		}
		try {
			return await handler.handle(event);
		} catch (error) {
			return ApiRouter.errorResponse(error);
		}
	}

	private static errorResponse(error: unknown): HttpResult {
		if (error instanceof ValidationError) {
			return HttpResponses.json(400, { error: error.message });
		}
		if (error instanceof UnauthorizedError) {
			return HttpResponses.json(401, { error: error.message });
		}
		if (error instanceof NotFoundError) {
			return HttpResponses.json(404, { error: error.message });
		}
		if (error instanceof MethodNotAllowedError) {
			return HttpResponses.json(405, { error: error.message });
		}
		return HttpResponses.json(500, { error: "Internal server error" });
	}
}
